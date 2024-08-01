// Config

const MAX_PATH_TRACES = 200; // How many individual traces we can do (prevent exponential problems or loops locking the system)
const START_TAG = "nodeStart";

var metadata;
var project;

// Compile a project to a sequence definition
export function CompileNodes(_project) {

    initEnvironment(_project);
    preprocessInfo();
    characterizePaths();
    postProcessSequences();
    postProcessSteamSequences();

    return {
        frame_rate: project.projectSettings.frame_rate,
        bit_depth: project.projectSettings.bit_depth,
        duration: metadata.duration,
        leds: metadata.sequences,
        led_hw_order_grb: project.projectSettings.led_hw_order_grb,
        led_hw_order_flip_serial: project.projectSettings.led_hw_order_flip_serial,
        c_definition: metadata.steam_c_def
    };
}

function htmlColorToRgbObject(_color) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(_color);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function postProcessSteamSequences() {
    let ledSequences = metadata.sequences;
    var requestedFrameStarts = [0];
    var endTime = 0;
    var frames = [];

    // First, find the frame boundaries
    for (let ledKey in ledSequences) {
        let led = ledSequences[ledKey]
        // Skip the first and second entries, as it is 0/0 start
        for (let i = 2; i < led.length; i++) {
            // Any time we have a second frame for an LED, we need a new frame for all
            if (!(requestedFrameStarts.includes(led[i].start))) {
                requestedFrameStarts.push(led[i].start)
            }

            if (led[i].end > endTime){
                endTime = led[i].end;
            }
        }
    }

    if (endTime > 0){
        requestedFrameStarts.push(endTime);
    }

    requestedFrameStarts.sort(function (a, b) { return a - b });

    // Create frames 
    for (let frameIndex = 1; frameIndex < requestedFrameStarts.length; frameIndex++) {
        let startTime = requestedFrameStarts[frameIndex - 1];
        let endTime = requestedFrameStarts[frameIndex];

        let frame = {}

        // Go through every LED and create a frame within this time
        for (let ledKey in ledSequences) {
            let led = ledSequences[ledKey]
            let ledFrame = {
                startValue: {
                    r: 0,
                    g: 0,
                    b: 0
                },
                endValue: {
                    r: 0,
                    g: 0,
                    b: 0
                },
                startTime: startTime,
                endTime: endTime
            }
            let ledWasChangedDuringFrame = false;
            // Skip the first entry, it's a start/0
            for (let i = 1; i < led.length; i++) {
                
                let ledSegmentIsEncapsulated = (led[i].start >= startTime) && (led[i].end <= endTime)
                let ledSegmentStartIsOutOfBounds = (led[i].start < startTime) && (led[i].end <= endTime) && (led[i].end > startTime)             
                let ledSegmentEndIsOutOfBounds = (led[i].start >= startTime) && (led[i].start < endTime) && (led[i].end > endTime)             
                let ledSegmentIsFullyOutOfBounds = (led[i].start < startTime) && (led[i].end > endTime)             
                let ledSegmentIsOutOfBounds = ledSegmentStartIsOutOfBounds || ledSegmentEndIsOutOfBounds || ledSegmentIsFullyOutOfBounds

                // Encapsulated - The Easy One
                if (ledSegmentIsEncapsulated) {
                    ledFrame.startTime = led[i].start;
                    ledFrame.endTime = led[i].end;
                    
                    // Set colors
                    ledFrame.startValue = htmlColorToRgbObject(led[i].startColor);
                    ledFrame.endValue = htmlColorToRgbObject(led[i].targetColor);

                    ledWasChangedDuringFrame = true;
                    break;
                }
                // Fully out of bounds
                else if (ledSegmentIsOutOfBounds) {

                    let ledStartValue = htmlColorToRgbObject(led[i].startColor);
                    let ledEndValue = htmlColorToRgbObject(led[i].targetColor);
                    let duration = led[i].end - led[i].start;

                    let colorSlopes = {
                        r: (ledStartValue.r - ledEndValue.r) / duration,
                        g: (ledStartValue.g - ledEndValue.g) / duration,
                        b: (ledStartValue.b - ledEndValue.b) / duration,
                    };

                    // Adjust the start values
                    if (led[i].start < startTime) {
                        let startDelta = startTime - led[i].start;
                        ledFrame.startValue = {
                            r: ledStartValue.r + (startDelta * colorSlopes.r),
                            g: ledStartValue.g + (startDelta * colorSlopes.g),
                            b: ledStartValue.b + (startDelta * colorSlopes.b)
                        };
                    } else {
                        ledFrame.startValue = ledStartValue;
                        ledFrame.startTime = led[i].start;
                    }

                    // Adjust the end values
                    if (led[i].end > endTime) {
                        let endDelta = endTime - led[i].start;
                        ledFrame.endValue = {
                            r: ledStartValue.r + (endDelta * colorSlopes.r),
                            g: ledStartValue.g + (endDelta * colorSlopes.g),
                            b: ledStartValue.b + (endDelta * colorSlopes.b)
                        };
                    } else {
                        ledFrame.endValue = ledEndValue;
                        ledFrame.endTime = led[i].end;
                    }

                    ledWasChangedDuringFrame = true;
                    break;
                }
            }
            if (!ledWasChangedDuringFrame) {
                // Make sure to keep the LED colors the same as last run
                if (frames.length > 0){
                    let lastColor = frames[frameIndex-2][ledKey].endValue
                    ledFrame.startValue = lastColor;
                    ledFrame.endValue = lastColor;
                }
            }
            ledFrame["frameStartTime"] = startTime; // Not super efficient, but memory is infinite, right?
            frame[ledKey] = ledFrame;
        }
        frames.push(frame);
    }

    if (frames.length == 0) { return; }

    // Output in C format

    let frameString = "Animation mAnimation = \n{";

    for (let i = 0; i < frames.length; i++) {
        let frame = frames[i];

        frameString += "\n    // Frame " + i;
        frameString += "\n    // --- ";

        for (let ledKey in frame) {
            let led = frame[ledKey];

            let localFrameStart = (led.startTime - led.frameStartTime);
            let localFrameEnd = (led.endTime - led.frameStartTime);

            // Modify to frame output if requested
            if (project.projectSettings.frame_output_enabled) {
                let frameRate = project.projectSettings.frame_rate;
                localFrameStart = msToFrameCount(localFrameStart, frameRate);
                localFrameEnd = msToFrameCount(localFrameEnd, frameRate);
            }

            frameString += "\n    // " + ledKey + "\n";  // Add a comment
            frameString += "    {\n        {";
            frameString += led.startValue.r + ", "
            frameString += led.startValue.g + ", "
            frameString += led.startValue.b + "},\n        {"
            frameString += led.endValue.r + ", "
            frameString += led.endValue.g + ", "
            frameString += led.endValue.b + "},\n        "
            frameString += localFrameStart + ", "
            frameString += localFrameEnd + "\n    },\n"
        }
    }

    frameString = frameString.substring(0, frameString.length - 2);
    frameString += "\n};"

    metadata.steam_c_def = frameString
}

export function PostProcessNodesForFirmware(_compiled, _project) {
    for (var led in _compiled.leds) {
        for (let i = 0; i < _compiled.leds[led].length; i++) {
            // Adjust for LED perception curves if requested
            if (_project.projectSettings.led_curve_output_enabled) {
                _compiled.leds[led][i].startValue = ledCurveAdjust(_compiled.leds[led][i].startValue);
                _compiled.leds[led][i].endValue = ledCurveAdjust(_compiled.leds[led][i].endValue);
            }

            // Switch to frames if necessary
            if (_project.projectSettings.frame_output_enabled) {
                let frameRate = _project.projectSettings.frame_rate;
                _compiled.leds[led][i].start = msToFrameCount(_compiled.leds[led][i].start, frameRate);
                _compiled.leds[led][i].end = msToFrameCount(_compiled.leds[led][i].end, frameRate);
                _compiled.leds[led][i].duration = msToFrameCount(_compiled.leds[led][i].duration, frameRate);
            }

            // Switch to properly quantized values
            if (!_project.projectSettings.percent_output_enabled) {
                let bitDepth = _project.projectSettings.bit_depth;
                _compiled.leds[led][i].startValue = percentToQuantizedValue(_compiled.leds[led][i].startValue, _project.projectSettings.bit_depth);
                _compiled.leds[led][i].endValue = percentToQuantizedValue(_compiled.leds[led][i].endValue, _project.projectSettings.bit_depth);
            }
        }
    }
    return _compiled;
}

function ledCurveAdjust(_brightnessPercent) {
    // perceived = 100 * Math.sqrt(brightness / 100);
    // brightness = 100 * Math.pow((perceived / 100), 2;
    return (100 * Math.pow((_brightnessPercent / 100), 2));
}

function initEnvironment(_project) {
    project = _project;

    metadata = {
        sequences: {},
        duration: 0
    }

    for (var i = 0; i < project.leds.length; i++) {
        metadata.sequences[project.leds[i]] = [];
    }
}


function preprocessInfo() {
    metadata["led_count"] = project.leds.length;

    // console.log("Compile Information:");
    // Object.keys(metadata).forEach(e => console.log(`${e}:  ${metadata[e]}`));
}

function characterizePaths() {
    // Find all paths branching from start
    metadata['paths'] = [];
    metadata['loopcount'] = 0; // Failsafe if there's a loop

    tracePaths([{
        nodeId: START_TAG,
        startTime: 0,
        endTime: 0
    }]);
}

function tracePaths(_path) {

    metadata.loopcount++;

    if (MAX_PATH_TRACES < metadata.loopcount) {
        alert("Too many path traces, may be a loop. Removed conflicting connection.")
        logError("Too many path traces, may be a loop. Removed conflicting connection.");
        return;
    }

    if (!_path) {
        alert("Invalid path definition");
        logError("Invalid path definition");
        return;
    }

    if (isInErrorState()) {
        return;
    }

    var nextStepFound = false;
    var lastPath = _path[_path.length - 1]
    var startId = lastPath.nodeId;
    var startTime = lastPath.endTime;

    for (var i = 0; i < project.connections.length; i++) {
        var connection = project.connections[i];
        if (startId == connection.source.id) {
            // We have to copy the array to avoid atomicity/crossing wires issues in recursion
            var path = _path.slice(0);
            var node = project.nodes[connection.target.id];

            if ("step" == node.operation) {
                node.duration = 0;
            }
            var endTime = startTime + node.duration;

            nextStepFound = true;

            path.push({
                nodeId: connection.target.id,
                startTime: startTime,
                endTime: endTime
            })

            if (endTime > metadata.duration) {
                metadata.duration = endTime;
            }

            if ((!node['led']) && (node['operation'] != 'delay')) {
                return; // User is still configuring their system
            }

            // Update any LEDs
            if ('led' in node) {
                if (node['led'] in metadata.sequences) {

                    // Inject a start value into the thing
                    if (0 == metadata.sequences[node.led].length) {
                        var segment = {
                            start: 0,
                            end: 0,
                            operation: "step",
                            targetColor: "#000000",
                            duration: 0,
                            endValue: 0,
                            mode: 0
                        };

                        metadata.sequences[node.led].push(segment);
                    }

                    var segment = {};

                    segment['start'] = startTime;
                    segment['end'] = startTime + node.duration; // Useful for error checking
                    segment['operation'] = node.operation;
                    segment['duration'] = node.duration;
                    segment['endValue'] = node.endValue;
                    segment['targetColor'] = node.targetColor;
                    segment['mode'] = node.mode;

                    metadata.sequences[node.led].push(segment);
                }
            }
            tracePaths(path);
        }
    }

    if (!nextStepFound) {
        metadata.paths.push(_path);
    }
}


function postProcessSequences() {
    // Organize and process sequences for each LED

    for (var key in metadata.sequences) {
        var sequence = metadata.sequences[key];

        // Sort by start times
        sortByKey(sequence, 'start');

        // Check for errors

        // Clear any unused data

        // Link up start data for ease of animation

        for (var i = 0; i < sequence.length; i++) {
            if (0 == i) {
                sequence[i].startValue = 0;
                sequence[i].startColor = "#000000";
            } else {
                sequence[i].startValue = sequence[i - 1].endValue;
                sequence[i].startColor = sequence[i - 1].targetColor;
            }
        }
    }

}

function sortByKey(array, key) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

function logError(_error) {
    console.log("[NodeCompiler] ERROR: %s", _error);
    if (!('errors' in metadata)) {
        metadata['errors'] = [];
    }
    metadata.errors.push(_error);
}

function isInErrorState() {
    return ('errors' in metadata);
}

function percentToQuantizedValue(_percent, _bitDepth) {
    return Math.round((_percent * (Math.pow(2, _bitDepth) - 1)) / 100);
}

function msToFrameCount(_ms, _frameRate) {
    return (_ms / (1000 / _frameRate));
}

export default {
    CompileNodes
};
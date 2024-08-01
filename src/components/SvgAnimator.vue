<template>
    <div style="">
        <div class="project-settings-header"> ANIMATION </div>
        <div class="toolbox">
            <a href='#' v-on:click="playPause" class="play-button tool-button">
                <i v-if="!isAnimating" class="fi-play" v-tooltip="{content:'Play Animation', placement:'auto-end'}" />
                <i v-else class="fi-stop" v-tooltip="{content:'Stop Animation', placement:'auto-end'}" />
            </a>
            <a href='#' class="tool-button repeat-button-off" v-on:click="toggleLooping"
                :class="{'repeat-button-on':isLooping}">
                <i class="fi-loop" v-tooltip="{content:'Loop Animation', placement:'auto-end'}" />
            </a>
            <a href='#' class="tool-button" v-on:click="showOpenSvgDialog">
                <i class="fi-folder" v-tooltip="{content:'Open SVG File'}" />
            </a>
            <a href='#' class="tool-button" v-on:click="openExportMP4Dialog">
                <i class="fi-download" v-tooltip="{content:'Export as MP4'}" />
            </a>
            <span class="tool-button">
                <i class="fi-usb" v-bind:style="{color: ((ledHWIsReady) ? '#7f7' : 'red')}"
                    v-tooltip="{content:'USB LEDs ' + ((ledHWIsReady) ? 'attached' : 'detached')}" />
            </span>
        </div>
        <div id='svgContainer'>
            <div id="svg" class="svgClass" v-html="svg"></div>
        </div>
        <div class="media-export-overlay" v-if="isExporting">
            <span class="media-export-overlay-label">Exporting...</span></div>
    </div>
</template>

<script>
    // TODO: Move this into animation module...
    // vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

    const FadeCandy = require('node-fadecandy');
    var path = require('path');
    var videoshow = require('videoshow');

    import {
        saveSvgAsPng
    } from '../lib/saveSvgAsPng'

    let fc = new FadeCandy();

    function calculateLedValue(_sequence, _time) {
        var value = null;

        for (var i = 0; i < _sequence.length; i++) {
            var segment = _sequence[i];
            if (_time >= segment.start && _time < segment.end) {
                switch (segment.operation) {
                    case 'transition':
                        return transition(segment, _time - segment.start);
                        break;
                    case 'delay':
                        return segment.startValue;
                        break;
                }
            }
        }
        return value;
    }

    function calculateRgbLedValue(_sequence, _time) {
        for (var i = 0; i < _sequence.length; i++) {
            let segment = _sequence[i];

            if (_time > segment.end && 0 < i) {
                // Make sure we set the last setting to avoid artifacts
                // Segments are built in order, so we know that if we're here
                // we've already gone past any usable data.
                // return _sequence[i-1].targetColor;
            }



            if (_time >= segment.start && _time < segment.end) {
                switch (segment.operation) {
                    case 'transition':
                        let brightness = transition(segment, _time - segment.start) * .01;

                        let rgbStart = [
                            Math.round(parseInt(segment.startColor.substr(1, 2), 16)),
                            Math.round(parseInt(segment.startColor.substr(3, 2), 16)),
                            Math.round(parseInt(segment.startColor.substr(5, 2), 16))
                        ];

                        let rgbTarget = [
                            Math.round(parseInt(segment.targetColor.substr(1, 2), 16)),
                            Math.round(parseInt(segment.targetColor.substr(3, 2), 16)),
                            Math.round(parseInt(segment.targetColor.substr(5, 2), 16))
                        ];

                        let rgbOutput = [];

                        for (let rgbIndex = 0; rgbIndex < rgbTarget.length; rgbIndex++) {
                            var spread = rgbTarget[rgbIndex] - rgbStart[rgbIndex];
                            // _segment.endValue - _segment.startValue;
                            var m = spread / segment.duration;

                            var x = _time - segment.start; // / _segment.duration;
                            var y = Math.round(brightness * (clamp((m * x) + rgbStart[rgbIndex], 0, 255)));


                            rgbOutput.push(y);
                        }

                        let result = '#';
                        // Post process output into single color
                        for (let i = 0; i < rgbOutput.length; i++) {
                            let hexConvertStr = "00" + rgbOutput[i].toString(16);
                            let hexStr = hexConvertStr.substring(hexConvertStr.length - 2, hexConvertStr.length);
                            result += hexStr;
                        }

                        return result;
                        break;
                    case 'delay':
                        return segment.startColor;
                        break;
                }
            }

            if (segment.start === segment.end && i >= 2) {

                switch (segment.operation) {
                    case 'transition':
                        let rgbTarget = [
                            Math.round(parseInt(segment.targetColor.substr(1, 2), 16)),
                            Math.round(parseInt(segment.targetColor.substr(3, 2), 16)),
                            Math.round(parseInt(segment.targetColor.substr(5, 2), 16))
                        ];

                        let rgbOutput = [];

                        for (let rgbIndex = 0; rgbIndex < rgbTarget.length; rgbIndex++) {
                            rgbOutput.push(rgbTarget[rgbIndex]);
                        }

                        let result = '#';
                        // Post process output into single color
                        for (let i = 0; i < rgbOutput.length; i++) {
                            let hexConvertStr = "00" + rgbOutput[i].toString(16);
                            let hexStr = hexConvertStr.substring(hexConvertStr.length - 2, hexConvertStr.length);
                            result += hexStr;
                        }

                        return result;
                        break;
                    case 'delay':
                        return segment.startColor;
                        break;
                }
            }
        }
    }

    function pad(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }

    // TODO: Remove magic numbers
    function transition(_segment, _time) {
        switch (_segment.mode) {
            case 1:
            case '1':
                return linearTransition(_segment, _time);
                break;
            case 2:
            case '2':
                return exponentialTransition(_segment, _time, 2);
                break;
            case 3:
            case '3':
                return sigmoidTransition(_segment, _time);
                break;
            case 4:
            case '4':
                return exponentialTransition(_segment, _time, 3);
                break;
            default:
                break;
        }
    }

    function linearTransition(_segment, _time, power) {
        // Easy peasy: y = mx + b
        var spread = _segment.endValue - _segment.startValue;
        var m = spread / _segment.duration;
        var x = _time; // / _segment.duration;
        var y = clamp((m * x) + _segment.startValue, 0, 100);

        // console.log("[Linear] y=mx+b: y=%f, m=%f, x=%f, b=%f, spread=%d", y, m, x, _segment.startValue, spread);

        return y;
    }

    function exponentialTransition(_segment, _time, _exp) {
        let d_y = (_segment.endValue - _segment.startValue);
        let d_x = _time / _segment.duration;
        let f_x = d_y * Math.pow(d_x, _exp) + _segment.startValue;

        // console.log("[Exponential] f_x: %d d_x: %d d_y: %d", f_x, d_x, d_y);
        return f_x;
    }

    function sigmoidTransition(_segment, _time) {
        let d_y = (_segment.endValue - _segment.startValue);
        // Use the curve -6 to +6 as it characterizes the S nicely
        let d_x = ((_time / _segment.duration) * 12) - 6;
        let f_x = d_y / (1 + Math.exp(-d_x));

        // console.log("[Sigmoid] f_x: %d d_x: %d d_y: %d", f_x, d_x, d_y);
        return f_x;
    }

    function clamp(num, min, max) {
        return num <= min ? min : num >= max ? max : num;
    }

    // Limited to 8 bits for monochrome... Ugh. 
    function percentToQuantizedGray(_percent, _bitDepth) {
        // Stick with what we can work with in HTML colors
        var steps = Math.pow(2, clamp(_bitDepth, 1, 8));
        let count = Math.round((_percent * (steps - 1)) / 100);
        let output = Math.floor(clamp(count * (256 / (steps - 1)), 0, 255));
        var value = ('00' + output.toString(16)).substr(-2);
        var htmlColor = '#' + value + value + value;

        return htmlColor;
    }

    function percentToQuantizedValue(_percent, _bitDepth) {
        var steps = Math.pow(2, clamp(_bitDepth, 1, 8));
        let count = Math.round((_percent * (steps - 1)) / 100);
        let output = Math.floor(clamp(count * (256 / (steps - 1)), 0, 255));

        return output;
    }

    // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

    import SvgViewerModal from "./SvgViewerModal"
    import {
        clearInterval
    } from 'timers';
    import {
        log
    } from 'util';
    const fs = require('fs');


    const {
        dialog
    } = require('electron').remote

    export default {
        name: 'svg-animator',
        props: ['leds', 'sequence', 'svg', 'projectSettings'],
        components: {
            SvgViewerModal
        },
        data() {
            return {
                isAnimating: false,
                isInitialized: false,
                isLooping: true,
                ledHWIsReady: false,
                svgElements: [],
                animationStep: 0,
                animationSteps: 4,
                currentTime: 0,
                ledState: new Uint8Array(3 * 512),
                ledUpdateThread: null,
                isExporting: false
            }
        },
        computed: {
            ledOffset: function() {
                let offset = (parseInt(this.projectSettings.led_fc_output_channel) * 64);

                console.log("LED Offset: " + offset);
                return offset;
            }
        },
        watch: {
            sequence() {
                console.log("=== SEQUENCE UPDATE COMPILED ===");
            }
        },
        mounted() {
            const me = this;
            // Initialize LED Hardware
            fc.on(FadeCandy.events.READY, function () {
                // Make sure the LUT is prepped
                fc.on(FadeCandy.events.COLOR_LUT_READY, function () {
                    me.ledHWIsReady = true;
                });

                // Library didn't quite catch the event right; so we will. :winky_face:
                fc.usb.on(FadeCandy.USBInterface.DETACHED, () => {
                    console.log("[FadeCandy] USB Detached, please reconnect");
                    me.$set(me.$data, 'ledHWIsReady', false); // Stop sending
                })

                fc.clut.create()
                fc.config.set(fc.Configuration.schema.LED_MODE, 1)

                let fcPcbLedIsOn = false;

                // This could be used more coherently to process
                // frames; we are slightly syncopated but I don't
                // believe anyone will actually notice... just
                // could be more pedantic to make me feel better
                // without too much actual increase in value, 
                // if any at all. 
                if (null != me.ledUpdateThread) {
                    clearInterval(me.ledUpdateThread);
                }
                me.ledUpdateThread = setInterval(() => {
                    if (me.ledHWIsReady) {
                        fcPcbLedIsOn = !fcPcbLedIsOn;
                        fc.config.set(fc.Configuration.schema.LED_STATUS, +fcPcbLedIsOn);
                        fc.send(me.ledState);
                    }
                }, 16);
            })
        },
        methods: {
            openExportMP4Dialog: function () {
                this.exportMP4(dialog.showSaveDialog({
                    filters: [{
                        name: 'MPEG4 Videos',
                        extensions: ['mp4']
                    }]
                }));
            },
            exportMP4: function (_path) {
                if (!_path) {
                    return; // Oops... somebody canceled. 
                }
                // Stop the animation
                this.isAnimating = false;
                this.isExporting = true;
                // Reset the animation
                this.resetRender();
                this.currentTime = 0;
                // Step the animation once (get rid of zero states if steps exist)
                this.animationStep = 1;
                this.$Progress.start();
                this.$Progress.set(0);
                this.runSvgExport(_path, 1, []); // Kick off the export

            },
            runSvgExport: function (_filepath, _index, _outputList) {

                // Need to recurse promises so that we don't change anything in 
                // SVG before processings is done... and await is dirty, dirty

                this.renderStep();
                this.animationStep++;
                this.currentTime += this.frameInterval();

                this.$Progress.set((100 * this.currentTime) / (this.sequence.duration));

                if (this.currentTime > this.sequence.duration) {
                    this.currentTime = 0;
                    this.$Progress.finish(); // Get rid of loader
                    this.isExporting = false;
                    this.runMP4Export(_filepath, _outputList);
                    return;
                }

                let filepath = path.dirname(_filepath) + "/svg_" + pad(_index, 6) + ".png";
                console.log("Exporting Intermediate File: %s", filepath);
                const me = this;
                saveSvgAsPng(document.getElementById("svg_leds"), filepath).then(function () {
                    _outputList.push(filepath);
                    me.runSvgExport(_filepath, _index + 1, _outputList);
                });
            },
            runMP4Export: function (_filepath, _outputList) {
                // Convert sequence to MP4
                console.log("[MP4 Export] Starting for %s", _filepath);
                console.dir(_outputList);
                const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
                const ffmpeg = require('fluent-ffmpeg');
                this.$Progress.start();
                const me = this;

                ffmpeg()
                    .setFfmpegPath(ffmpegInstaller.path)
                    .addInput(path.dirname(_filepath) + '/svg_%06d.png')
                    .videoCodec('libx264')
                    .inputOptions('-r ' + this.sequence.frame_rate)
                    .fps(29.97)
                    .outputOptions('-pix_fmt yuv420p') // Quicktime compat
                    .on('progress', function (progress) {
                        me.$Progress.set(progress.percent);
                    })
                    .on('stderr', function (stderrLine) {
                        console.log('Stderr output: ' + stderrLine);
                    })
                    .on('error', function (err, stdout, stderr) {
                        // Delete tmp files
                        for (let i = 0; i < _outputList.length; i++) {
                            fs.unlinkSync(_outputList[i]);
                        }
                        console.log('Cannot process video: ' + err.message);
                    }).on('end', function (stdout, stderr) {
                        me.$Progress.finish(); // Get rid of loader
                        // Delete tmp files
                        for (let i = 0; i < _outputList.length; i++) {
                            fs.unlinkSync(_outputList[i]);
                        }
                        console.log('Transcoding succeeded !');
                    }).save(_filepath);
            },
            loadAnimation: function () {
                var doc = document;
                this.svgElements = [];
                for (var i = 0; i < this.leds.length; i++) {
                    var e = doc.getElementById(this.leds[i]);
                    if (e != null) {
                        this.svgElements.push(e);
                        e.style.fill = "black";
                    }
                }
                this.animationSteps = this.leds.length;
                this.isInitialized = true;
                this.stepAnimation();
            },
            frameInterval: function () {
                var retVal = 1000 / this.sequence.frame_rate;
                return retVal;
            },
            stepAnimation: function () {
                if (!this.isAnimating) {
                    return;
                }
                if (!this.isInitialized) {
                    this.loadAnimation();
                    return;
                }
                if (this.animationStep > this.animationSteps) {
                    this.animationStep = 0;
                }

                this.renderStep();
                this.animationStep++

                this.currentTime += this.frameInterval();
                if (this.currentTime > this.sequence.duration) {
                    this.currentTime = 0;
                    this.resetRender();
                    if (!this.isLooping) {
                        this.stopAnimation();
                        return;
                    }
                }

                setTimeout(() => {
                    this.stepAnimation();
                }, this.frameInterval());
            },
            resetRender: function () {
                for (var ledId in this.sequence.leds) {
                    var svgElement = this.svgElements[this.leds.indexOf(ledId)];
                    svgElement.style.fill = "#000";
                }
            },
            renderStep: function () {
                for (var ledId in this.sequence.leds) {
                    let index = this.leds.indexOf(ledId);
                    let adjustedIndex = ((this.sequence.led_hw_order_flip_serial) ? (this.leds.length-1) - index : index);
                    var svgElement = this.svgElements[index];
                    var sequence = this.sequence.leds[ledId];
                    var color = calculateRgbLedValue(sequence, this.currentTime);
                    svgElement.style.fill = color;

                    // Set the LED hardware
                    if (this.ledHWIsReady) {
                        // TODO: Update for quantization
                        if (null != color) {

                            let red = parseInt(color.substring(1, 3), 16);
                            let green = parseInt(color.substring(3, 5), 16);
                            let blue = parseInt(color.substring(5, 7), 16);

                            let i = ((adjustedIndex + this.ledOffset) * 3);

                            // BGR Mode
                            if (this.sequence.led_hw_order_grb) {
                                this.ledState[i] = green;
                                this.ledState[i + 1] = red;
                                this.ledState[i + 2] = blue;
                            // RGB Mode
                            } else {
                                this.ledState[i] = red;
                                this.ledState[i + 1] = green;
                                this.ledState[i + 2] = blue;
                            }
                        }
                    }
                }
            },
            toggleLooping: function () {
                if (this.isLooping) {
                    this.isLooping = false;
                } else {
                    this.isLooping = true;

                }
            },
            playPause: function () {
                if (this.isAnimating) {
                    this.stopAnimation();
                } else {
                    // Compile new animation
                    this.$parent.compile();
                    this.startAnimation();
                }
            },
            stopAnimation: function () {
                this.isAnimating = false;
                this.animationStep = 0;
                this.renderStep();
            },
            startAnimation: function () {
                this.isAnimating = true;
                this.stepAnimation();
            },
            loadSvg: function (_path) {
                console.log("Opening %s", _path[0]);
                if (null == _path || undefined == _path) {
                    return;
                }
                this.$emit('svgSelected', _path[0]);
            },
            reloadSvg: function () {
                var container = document.getElementById("svgContainer");
                // var content = container.innerHTML;
                // console.log(this.svg);
                var content = this.svg;
                container.innerHTML = content;
                this.isInitialized = false;
            },
            showOpenSvgDialog: function () {
                this.loadSvg(dialog.showOpenDialog({
                    properties: ['openFile'],
                    filters: [{
                        name: 'SVG Files',
                        extensions: ['svg']
                    }]
                }));
            },
        }
    }
</script>

<style>
    .tooltip {
        position: relative;
        z-index: 56;
    }

    .project-settings-header {
        width: 100%;
        margin-top: 12px;
        padding-left: 0.5rem;
    }

    .toolbox {
        padding-left: 0.5rem;
    }

    .repeat-button-on {
        color: #7f7 !important;
    }

    .repeat-button-off {
        color: #555;
    }

    .svgClass {
        position: relative;
        width: 100%;
    }

    .media-export-overlay {
        position: absolute;
        width: 100%;
        height: 100%;
        left: 0px;
        top: 0px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
    }

    .media-export-overlay-label {
        color: white;
        font-size: 14pt;
        width: 110%;
        position: absolute;
        left: -5%;
        top: 50%;
        transform: translate(0%, -50%);
        text-align: center;
    }
</style>
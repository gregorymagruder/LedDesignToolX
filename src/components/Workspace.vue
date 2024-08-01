<template>
    <div class="workspace">
        <nav id="menu">
            <div class="name-header"> ANIMATRIX
                <div class="settings-divider" style="width: 263px" />
            </div>
            <div class="header-spacer"></div>
            <project-settings :projectSettings.sync="projectSettings" :saveObjectOB="saveObjectOB"
                :saveObjectRE="saveObjectRE" @saveClicked="save" @openClicked="load" @newFile="newFile"
                @exportAnimationToJson="exportAnimationToJson" @compile="compile" />
            <div class="settings-divider" />
            <svg-animator ref="svgAnimator" @svgSelected="loadSvg" @ledCount="setLedCount" :leds.sync="leds"
                :sequence.sync="compiled_sequence" :svg.sync="svgData" :projectSettings.sync="projectSettings" />
            <div class="settings-divider" />
            <attribute-view ref="AttributeView" @nodeUpdated="nodeUpdated" :nodes.sync="nodes" :leds.sync="leds"
                :projectSettings.sync="projectSettings" @deleteNode="deleteNode" />
            <!-- <primitive-settings /> -->
        </nav>

        <main id="panel">
            <header>
                <div class='tool-bar safe'>
                    <div class="tool-button toggle-button safe" ref="toggleSidenavBtn"><i class="fi-list"
                            v-tooltip="{content:'Settings', placement:'auto-end'}" /></div>
                    <div v-on:click='addNode' class='tool-button safe' v-shortkey="['ctrl', 't']" @shortkey="addNode"><i
                            class="fi-plus" v-tooltip="{content:'New Transition (CTRL+T)', placement:'auto-end'}" />
                    </div>
                </div>
            </header>

            <body>
                <node-editor ref='nodeEditor' :nodes.sync='nodes' :leds.sync="leds" :connections.sync="connections"
                    :projectSettings.sync="projectSettings" @compile="compile" @showAttributes="showAttributes"
                    @hideAttributes="hideAttributes" />
            </body>
        </main>
    </div>
</template>

<script>
    import ProjectSettings from "./ProjectSettings";
    import PrimitiveSettings from "./PrimitiveSettings";
    import SvgAnimator from "./SvgAnimator";
    import AttributeView from "./AttributeView"
    import NodeEditor from "./NodeEditor";
    import {
        CompileNodes,
        PostProcessNodesForFirmware
    } from '../lib/NodeCompiler';
    import {
        log
    } from 'util';
    import {
        ipcRenderer
    } from 'electron';

    var json = require('format-json');
    var fs = require('fs');

    String.prototype.splice = function (index, count, add) {
        if (index < 0) {
            index = this.length + index;
            if (index < 0) {
                index = 0;
            }
        }
        return this.slice(0, index) + (add || "") + this.slice(index + count);
    }

    export default {
        name: 'workspace',
        components: {
            ProjectSettings,
            PrimitiveSettings,
            AttributeView,
            SvgAnimator,
            NodeEditor
        },
        data() {
            // Don't save compiled_sequence; should be compiled on each machine to avoid error
            return {
                projectSettings: {},
                svgData: "",
                nodes: {},
                leds: [],
                connections: [],
                compiled_sequence: {
                    frame_rate: 10,
                    duration: 0,
                    bit_depth: 8,
                },
                filePath: "",
                saveObjectOB: {},
                saveObjectRE: {}
            }
        },
        mounted: function () {

            this.newFile();
        },
        watch: {
            nodes: function () {
                this.compile();

            }
        },
        methods: {
            addNode: function () {
                this.$refs.nodeEditor.enterAddNodeMode();
            },
            nodeUpdated: function () {
                this.$refs.nodeEditor.nodeUpdated();
            },
            deleteNode: function (_node) {
                this.$refs.nodeEditor.deleteNode(_node);
            },
            showAttributes: function (_node) {
                this.$refs.AttributeView.show(_node);
            },
            hideAttributes: function () {

                this.$refs.AttributeView.hide();
            },
            save: function (_filePath) {

                const _saveObject = {
                    projectSettings: this.projectSettings,
                    svgData: this.svgData,
                    nodes: this.nodes,
                    connections: this.connections,
                    leds: this.leds
                };

                this.saveObjectOB = JSON.parse(JSON.stringify(_saveObject));

                this.saveObjectRE = _saveObject;


                ipcRenderer.send('eHelper', true)

                fs.writeFile(this['projectSettings']['filePath'] || _filePath, json.plain(_saveObject), (err) => {
                    if (err) {
                        alert("An error ocurred creating the file " + err.message)
                        return;
                    } else {
                        this.projectSettings['filePath'] = _filePath;
                    }

                    alert("The file has been succesfully saved");
                });


            },
            load: function (_path, _doStorePath = true) {

                // either put in new path or existing 
                fs.readFile(_path || this['projectSettings']['filePath'], 'utf-8', (err, data) => {
                    if (err) {
                        alert("An error ocurred reading the file :" + err.message);
                        return;
                    }
                    var parsedPreprocessed = JSON.parse(data);
                    let parsed = this.legacySupport(parsedPreprocessed);

                    for (var key in parsed) {
                        this[key] = parsed[key];
                    }

                    // Update file location based on here we opened it from
                    if (true === _doStorePath) {

                        this['projectSettings']['filePath'] = _path;
                    }

                    if (!('svgData' in parsed)) {
                        var basePath = require('electron').remote.app.getAppPath();
                        // console.log("Base path: %s", basePath);
                        this.loadSvg((basePath + '/src/assets/svg/leds.svg'));
                    } else {
                        console.log("Loading SVG from opened project...")
                        const me = this;
                        this.$nextTick(function () {
                            this.$refs.svgAnimator.reloadSvg();
                        });
                    }
                });
            },
            legacySupport: function (_parsedSaveFileKeys) {
                if ('projectSettings' in _parsedSaveFileKeys){
                    if (!('led_fc_output_channel' in _parsedSaveFileKeys['projectSettings'])){
                        _parsedSaveFileKeys['projectSettings']['led_fc_output_channel'] = "7"
                    }
                }
                if ('nodes' in _parsedSaveFileKeys) {
                    for (var node in _parsedSaveFileKeys['nodes']) {
                        _parsedSaveFileKeys['nodes'][node]['endValue'] = 100;
                        if (!("targetColor" in _parsedSaveFileKeys['nodes'][node])) {
                            // We use white here, as if this key isn't in here, then
                            // the file is brightness based. This won't change the operation
                            _parsedSaveFileKeys['nodes'][node]['targetColor'] = "#ffffff";
                        }
                        if (!("target_color" in _parsedSaveFileKeys['nodes'][node])) {
                            // Don't worry, the compiler will take care of this random value
                            _parsedSaveFileKeys['nodes'][node]['target_color'] = {
                                "red": 0,
                                "green": 0,
                                "blue": 0 
                            };
                        }
                        if (!("resultingColor" in _parsedSaveFileKeys['nodes'][node])) {
                            // Don't worry, the compiler will take care of this random value
                            _parsedSaveFileKeys['nodes'][node]['resultingColor'] = "#ffffff";
                        }
                        if (!("errors" in _parsedSaveFileKeys['nodes'][node])) {
                            _parsedSaveFileKeys['nodes'][node]['errors'] = {};
                        }
                    }
                }
                console.log(_parsedSaveFileKeys);
                return _parsedSaveFileKeys;
            },
            newFile: function () {
                var basePath = require('electron').remote.app.getAppPath();

                // console.log("Base path: %s", basePath);
                this.load((basePath + '/default.json'), false);

            },
            loadSvg: function (_path) {

                fs.readFile(_path, 'utf-8', (err, svg) => {

                    let hasSvg = false;
                    let hasLEDs = false;
                    let hasSize = false;

                    if (err) {
                        alert("An error ocurred reading the file :" + err.message);
                        return;
                    }

                    svg.toString().split("\n").forEach(function (line, index, arr) {

                        if (index === arr.length - 1 && line === "") {
                            return;
                        }

                        switch (true) {

                            case line.includes(`class="led_`):
                                let i = line.indexOf(`class="led_`)

                                try {
                                    throw new Error("Invalid selector at line " + index + `: ` +
                                        line.substring(i, i + 13));
                                } catch (e) {
                                    alert(e);
                                }

                                break;

                            case line.includes(`<svg`):
                                hasSvg = true;

                                break;

                            case line.includes(`id="led_`):
                                hasLEDs = true;

                                break;

                            case index < 100:

                                if (line.includes(`height="`)) {
                                    hasSize = true;

                                }
                                if (line.includes(`width="`)) {
                                    hasSize = true;

                                }

                                break;


                            default:
                                return;
                                break;
                        }


                    });

                    // Grab the first index of the end of an element header...
                    // If this doesn't work, you've got bigger problems in your
                    // SVG file
                    let widthStart = svg.indexOf("width=") + 7;
                    let widthLength = svg.substring(widthStart + 1).indexOf("\"") + 1;
                    let tmpStr1 = svg.splice(widthStart, widthLength, "100%");
                    let heightStart = tmpStr1.indexOf("height=") + 8;
                    let heightLength = tmpStr1.substring(heightStart + 1).indexOf("\"") + 1;

                    // TODO: move SVG sizes into config... magic numbers hurt families
                    this['svgData'] = tmpStr1.splice(heightStart, heightLength, "auto");

                    let container = document.getElementById("svgContainer");
                    let content = this['svgData'];
                    container.innerHTML = content;

                    // Extract LED information:
                    this['leds'] = []; // Clear any old data
                    var strIndex = 0;

                    while (0 <= strIndex) {

                        var newIndex = svg.substring(strIndex, svg.length).indexOf('id="led_');

                        if (-1 == newIndex) {
                            strIndex = -1;
                        } else {
                            strIndex += newIndex;
                        }
                        var lString = svg.substring(strIndex + 4, svg.length);


                        if (0 < strIndex) {
                            // Extract the led name
                            var strEnd = lString.indexOf('"');
                            var label = lString.substring(0, strEnd);
                            strIndex += strEnd + 4; // Jump over the last find so we don't cycle endlessly
                            this['leds'].push(label);

                        }

                    }

                    const _reloadSvg = () => {
                        let basePath = require('electron').remote.app.getAppPath();
                        this.loadSvg((basePath + '/src/assets/svg/leds.svg'));
                    }

                    if (!hasLEDs) {
                        try {
                            throw new Error('Found No LEDs. File unusable ');
                        } catch (e) {
                            alert(e);
                        }

                        _reloadSvg()

                    } else if (!hasSvg) {
                        try {
                            throw new Error('Found No SVG. File unusable ');
                        } catch (e) {
                            alert(e);
                        }

                        _reloadSvg()

                    } else if (!hasSize) {
                        try {
                            throw new Error('Cannot find width or height in SVG. File unusable ');
                        } catch (e) {
                            alert(e);
                        }

                        _reloadSvg()

                    } else {
                        let container = document.getElementById("svgContainer");
                        let content = this['svgData'];
                        container.innerHTML = content;

                    }

                    // Sort labels
                    this['leds'].sort();
                });
            },
            exportAnimationToJson: function (_filePath) {
                // First, compile to be safe; don't play with the reactive
                // object. 
                let compiled = CompileNodes(this.$data);

                // let firmwareSpec = PostProcessNodesForFirmware(compiled, this.$data);

                // fs.writeFile(_filePath, JSON.stringify(firmwareSpec), (err) => {
                //     if (err) {
                //         alert("An error ocurred creating the file " + err.message)
                //     }
                //     alert("Successful Export!");
                // });

                fs.writeFile(_filePath, compiled.c_definition, (err) => {
                    if (err) {
                        alert("An error ocurred creating the file " + err.message)
                    }
                    alert("Successful Export!");
                });                
            },
            setLedCount: function (_count) {
                console.log("Setting LED Count to %d", _count);
                this.projectSettings.led_count = _count;
            },
            compile: function () {
                console.log(">>> Compiling Nodes...");
                this.compiled_sequence = CompileNodes(this.$data);
                console.dir(this.compiled_sequence);
                console.log("<<< Compilation of Nodes Complete");
            }
        }
    }
</script>

<style>
    .workspace {
        overflow-x: hidden !important;
    }

    .error-div {
        height: 256px;
        width: 256px;
    }

    ::-webkit-scrollbar {
        display: none;
    }

    #menu {
        position: absolute;
        overflow-x: hidden;
        width: 256px;
        height: 100%;
        padding: 0px;
        z-Index: 55;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        -webkit-touch-callout: none;
        /* iOS Safari */
        -webkit-user-select: none;
        /* Safari */
        -khtml-user-select: none;
        /* Konqueror HTML */
        -moz-user-select: none;
        /* Firefox */
        -ms-user-select: none;
        /* Internet Explorer/Edge */
        user-select: none;
        /* Non-prefixed version, currently
                                  supported by Chrome and Opera */
    }

    .name-header {
        position: absolute;
        padding-top: 35px;
        top: 0px;
        left: 0px;
        width: 248px;
        height: 2rem;
        padding-left: 0.5rem;
        background: #000;
        font-size: 1.5rem;
    }

    .header-spacer {
        position: relative;
        height: 2rem;
        width: 100%;
    }

    /* Tool Bar Styles */
    .tool-bar {
        position: absolute;
        margin: 55px 0px 0px 8px;
        z-Index: 1000;
        text-align: center;
    }

    .tool-button {
        position: relative;
        background: tranparent;
        text-decoration: none;
        font-size: 24pt;
        color: red;
        width: 36px;
        height: 36px;
        margin: 0px 5px 0px 0px;
        transition: all 0.2s;
        opacity: 1;
        text-align: center;
    }

    .tool-button:hover {
        opacity: 0.7;
    }

    /* Project Settings Styles */

    .settings-divider {
        position: relative;
        height: 2px;
        width: 272px;
        background: #444;
        left: -15px;
    }

    /* Slideout Settings */

    .slideout-menu {
        position: fixed;
        top: 0;
        bottom: 0;
        width: 256px;
        height: 100vh;
        overflow-y: scroll;
        -webkit-overflow-scrolling: touch;
        z-index: 0;
        display: none;
        background-color: #1d1f20;
        color: white;
    }

    .slideout-menu-left {
        left: 0;
    }

    .slideout-menu-right {
        right: 0;
    }

    .slideout-panel {
        background-color: black;
        color: white;
        position: relative;
        z-index: 1;
        will-change: transform;
        min-height: 100vh;
    }

    .slideout-open,
    .slideout-open body,
    .slideout-open .slideout-panel {
        overflow: hidden;
    }

    .slideout-open .slideout-menu {
        display: block;
    }

    input {
        color: white;
        border-radius: 50px;
        border: solid 1px white;
        background-color: black;
        padding: 4px 8px 4px 8px;
        font-size: 12pt;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        text-align: center;
    }
</style>
<template>
    <div class="project-settings-container">
        <div class="project-settings-header">PROJECT</div>
        <div class="toolbox">
            <a v-on:click="newFile" href='#' v-shortkey="['ctrl', 'n']" @shortkey="newFile" class="tool-button"
                v-tooltip="{content:'New Project (CTRL+N)', placement:'auto-end'}">
                <i class="fi-plus"></i>
            </a>
            <a @click="showSaveFileDialog" href='#' v-shortkey="['ctrl', 's']" @shortkey="showSaveFileDialog"
                class="tool-button" v-tooltip="{content:'Save Project (CTRL+S)', placement:'auto-end'}">

                
                <i class="fi-save" />
            </a>
            <a v-on:click="showOpenFileDialog" href='#' v-shortkey="['ctrl', 'o']" @shortkey="showOpenFileDialog"
                class="tool-button" v-tooltip="{content:'Open Project (CTRL+O)', placement:'bottom '}">
                <i class="fi-folder" />
            </a>
            <a v-on:click="showExportJsonFileDialog" href='#' v-shortkey="['ctrl', 'e']"
                @shortkey="showExportJsonFileDialog" class="tool-button"
                v-tooltip="{content:'Export Steam C Definition (CTRL+E)'}">
                <i class="fi-page-export" />
            </a>
        </div>

        <input placeholder="My Project Name" class='project-name-input' v-model='projectSettings.title'
            @change="onInput">
        <div class="settings-section-header" @click="expandHardwareSettings"><i class="fi-plus"></i>
            &nbsp;&nbsp;Hardware</div>
        <div class="hardware-settings">
            <table>
                <tr>
                    <td style="width:90px; text-align:left; font-size:10pt;">
                        FRAME RATE
                    </td>
                    <td>
                        <input class="number-input" type='text' v-model.number='projectSettings.frame_rate'
                            @input="onInput" />
                    </td>
                    <td>
                        Hz
                    </td>
                </tr>
            </table>
            <table>
                <tr>
                    <td style="width:90px; text-align:left; font-size:10pt;">
                        RESOLUTION
                    </td>
                    <td>
                        <input class="number-input" type='text' v-model.number='projectSettings.bit_depth'
                            @input="onInput" />
                    </td>
                    <td>
                        bits
                    </td>
                </tr>
            </table>
        </div>
        <div class="settings-section-header" @click="expandOutputSettings"><i class="fi-plus"></i> &nbsp;&nbsp;Output
        </div>
        <div class="output-settings">
            <input type="checkbox" id="cb_frame_output" v-model="projectSettings.frame_output_enabled">
            <label for="cb_frame_output">Output by Frames</label>
            <br>
            <input type="checkbox" id="cb_percent_output" v-model="projectSettings.percent_output_enabled">
            <label for="cb_percent_output">Brightness by Percent</label>
            <br>
            <input type="checkbox" id="cb_led_correction_output" v-model="projectSettings.led_curve_output_enabled">
            <label for="cb_led_correction_output">LED Curve Correction</label>
            <br>
            <input type="checkbox" id="cb_led_grb_order_output" v-model="projectSettings.led_hw_order_grb">
            <label for="cb_led_grb_order_output" v-tooltip="{content:'Requires animation to be stopped and restarted to take effect.', placement:'auto-end'}">GRB LED Output</label>
            <br>
            <input type="checkbox" id="cb_led_flip_serial_order" v-model="projectSettings.led_hw_order_flip_serial">
            <label for="cb_led_flip_serial_order" v-tooltip="{content:'Requires animation to be stopped and restarted to take effect.', placement:'auto-end'}">Flip HW LED Order</label>            
            <br>
            <select id="fc_output_channel" v-model="projectSettings.led_fc_output_channel" @change="onLedChannelChange($event)">
                <option value="0"> D0 </option>
                <option value="1"> D1 </option>
                <option value="2"> D2 </option>
                <option value="3"> D3 </option>
                <option value="4"> D4 </option>
                <option value="5"> D5 </option>
                <option value="6"> D6 </option>
                <option value="7"> D7 </option>
            </select>
            <span> FC LED Channel</span>
        </div>
    </div>
</template>

<script>
    const {
        dialog
    } = require('electron').remote
    import 'jquery';
    import { ipcRenderer } from 'electron';
import { log } from 'util';

    export default {
        name: 'project-settings',
        props: ['projectSettings', 'saveObjectOB', 'saveObjectRE'],
        data() {
            return {
                projSaved: "",
            }
        },
        mounted: function () {
          this.saveOnExit()
        },
        methods: {
            expandHardwareSettings: function () {
                $('.hardware-settings').slideToggle(500);
            },
            expandOutputSettings: function () {
                $('.output-settings').slideToggle(500);
            },
            showOpenFileDialog: function () {
                const me = this;

                this.$modal.show('dialog', {
                    title: 'Open Project?',
                    text: 'You will lose any unsaved changes to the current project.',
                    buttons: [{
                            title: 'I\'m Cool With That',
                            default: true, // Will be triggered by default if 'Enter' pressed.
                            handler: () => {
                                me.$modal.hide('dialog');
                                this.openFile(dialog.showOpenDialog({
                                    properties: ['openFile'],
                                    filters: [{
                                        name: 'Animatrix Project Files',
                                        extensions: ['atx']
                                    }]
                                }));
                            }
                        },
                        {
                            title: 'Cancel'
                        }
                    ]
                })
            },
            showSaveFileDialog: function () {
                
                if (!('filePath' in this.projectSettings)) {
                    this.saveFile(dialog.showSaveDialog({
                        filters: [{
                            name: 'Animatrix Project Files',
                            extensions: ['atx']
                        }]
                    }));
                } else {
                    this.saveFile(this.projectSettings.filePath);
                }
            },
            showExportJsonFileDialog: function () {
                this.exportAnimationToJson(dialog.showSaveDialog({
                    filters: [{
                        name: 'C Files',
                        extensions: ['c']
                    }]
                }));
            },
            openFile: function (_path) {
                console.log("Opening %s", _path[0]);
                if (null == _path || undefined == _path) {
                    return;
                }
                this.$emit('openClicked', _path[0]);
            },
            saveFile: function (_path) {
                console.log("Saving to %s", _path);


                if (null == _path || undefined == _path) {
                    return;
                }
                this.$emit('saveClicked', _path);
            },
            newFile: function () {

                const me = this;
                let saveObjectOB;
                let saveObjectRE;
         

                try {
                    saveObjectOB = Object.keys(this.saveObjectOB['nodes']).length 
                    saveObjectRE = Object.keys(this.saveObjectRE['nodes']).length
                    
                }
                catch(error) {
                    me.$emit('newFile');
                    
                }

                if (this.saveObjectOB['nodes'] === undefined) {
                    me.$emit('newFile');
                }

                if(saveObjectOB === undefined && saveObjectRE === undefined){
                    return
                }

                if (saveObjectOB >= saveObjectRE) {
                    
                        me.$emit('newFile');

                } else {

                    this.$modal.show('dialog', {
                        title: 'Create New Project?',
                        text: 'You will lose any unsaved changes to the current project.',
                        buttons: [{
                                title: 'I\'m Cool With That',
                                default: true, // Will be triggered by default if 'Enter' pressed.
                                handler: () => {
                                    me.$emit('newFile');
                                    me.$modal.hide('dialog');
                                }
                            },
                            {
                                title: 'Cancel'
                            }
                        ]
                    })
                }

            },
            exportAnimationToJson: function (_path) {
                console.log("Exporting to %s", _path);
                if (null == _path || undefined == _path) {
                    return;
                }
                this.$emit('exportAnimationToJson', _path);
            },
            onInput: function () {
                console.log("Field changed, update project");
                console.dir(this.projectSettings);
                this.$emit('update:projectSettings', this.projectSettings);
                this.$emit('compile');
            },
            saveOnExit: function () {
                ipcRenderer.on('exit-helper', (event, arg) => {
                    this.projSaved = arg;
                })

                ipcRenderer.on('event_from_main', (event, arg) => {
                    if (!this.projSaved) {
                        // not saved
                        ipcRenderer.send('event_from_renderer', false)
                
                    } else {
                        //saved
                        ipcRenderer.send('event_from_renderer', true)
                        console.log("good");

                    }
                })
                
                ipcRenderer.on('save-exit', (event, arg) => {
                    this.showSaveFileDialog();
                });
            }, 
            onLedChannelChange: function(event) {

            }
        }
    }
</script>

<style scoped>
    .tooltip{
        position: relative;
        z-index: 56;
    }
    .project-name-input:focus{
        outline: none;
        box-shadow: 0px 0px 16px orange;
    }
    .project-settings-container {
        /* padding: 0.5rem; */
        margin-top: 19%;

    }

    .project-settings-header {
        width: 100%;
        margin-top: 12px;
        padding-left: 0.5rem;
    }

    .toolbox {
        padding-left: 0.5rem;
    }

    .project-name-input {
        margin: 0.5rem;
        width: calc(100% - 1rem);
        padding: 0.5rem;
    }

    .number-input {
        width: 60px;
        text-align: center;
    }

    .hardware-settings {
        display: none;
        padding: 10px;
    }

    .output-settings {
        display: none;
        padding: 10px;
    }

    .settings-section-header {
        position: relative;
        width: 100%;
        height: 1.2rem;
        padding: .2rem;
        background: black;
        cursor: pointer;
    }

    .settings-section-dropdown {
        position: relative;
        left: 0px;

    }
</style>
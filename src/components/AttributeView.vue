<template>
    <div class="attribute-container">
        <div class="box-title">
            <div class="" style="padding-top: 12px">TRANSITION</div>
        </div>
        <div v-if="isDisplaying" class="tool-button" v-on:click="deleteMe()" v-shortkey="['ctrl','backspace']" @shortkey="deleteMe"><i class="fi-trash"
                v-tooltip="{content:'Delete Node', placement:'auto-end'}"></i></div>

        <div class="marquee" v-if="!isDisplaying"> Please select a node to see attributes </div>
        <ul v-else class="attribute-table">
            <!-- Operation -->
            <!-- <td class="attribute-title"> Function </td> -->
            <td class="attribute-info">
                <select class="attributeSelect" v-model="node.operation" @input="$emit('nodeUpdated')">
                    <option v-for="operation in operations" v-bind:value="operation.value" v-bind:key="operation.value">
                        {{ operation.text }}
                    </option>
                </select>
            </td>
            <!-- <td class="attribute-unit">
            </td> -->



            <li v-for="(attr, key) in node" v-bind:key="key">

                <!-- Type -->
                <div v-if="key == 'mode'" v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, key)}">
                    <!-- <td class="attribute-title"> Mode </td> -->
                    <!-- <v-select label="text" :options="modes" v-model="node.mode" :value="node.mode" @input="$emit('nodeUpdated')"/> -->
                    <td class="attribute-info">
                        <select class="attributeSelect" v-model="node.mode" @input="$emit('nodeUpdated')">
                            <option v-for="mode in modes" v-bind:value="mode.value" v-bind:key="'mode_'+mode.value">
                                {{ mode.text }}
                            </option>
                        </select>
                    </td>
                    <!-- <td class="attribute-unit">
                    </td> -->
                </div>
                <!-- LED Selection -->
                <div v-if="key == 'led'" v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, key)}">

                    <!-- <td class="attribute-title"> LED </td> -->
                    <td class="attribute-info">
                        <select class="attributeSelect" v-model="node.led" @input="$emit('nodeUpdated')">
                            <option value="" disabled selected>Select LED</option>
                            <option v-for="led in leds" v-bind:value="led" v-bind:key="led" >
                                {{ led }}
                            </option>
                        </select>
                    </td>
                    <!-- <td class="attribute-unit">
                    </td> -->
                </div>

                <!-- LED Value (Brightness) -->
                <!-- <div v-if="key == 'endValue'" v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, key)}">
                    <td class="attribute-title"> Brightness </td>
                    <td class="attribute-info">
                        <input v-bind:class="{percentInput:true}" v-model.number="node.endValue"
                            @input="$emit('nodeUpdated')" type="number" min=0 max=100 />
                    </td>
                    <td class="attribute-unit">
                        %
                    </td>
                    <td>
                        &nbsp; => {{quantizedBrightness}}%
                    </td>
                </div> -->

                <!-- LED Color -->
                <div id="ledColor" v-if="key == 'targetColor'" class="colorBox"
                    v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, key)}">

                    <td class="attribute-info" id="hex-input">

                        <chrome-picker v-model="colors" @input="updateValue(); $emit('nodeUpdated'); "></chrome-picker>

                    </td>

                </div>

                <!-- Duration -->
                <div v-if="key == 'duration'" v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, key)}">
                    <!-- <td class="attribute-title"> Duration </td> -->
                    <td class="attribute-info" style="padding-left: 2vw;">
                        <input v-bind:class="{timeInput:true}" v-model.number="node.duration"
                            @input="$emit('nodeUpdated')" />
                    </td>
                    <td class="attribute-unit">
                        &nbsp ms
                    </td>
                </div>


            </li>

            <li>
                <!-- Slots -->
                <div v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, 'slots')}">
                    <td class="attribute-title"> Name </td>
                    <br/>
                    <td class="attribute-info">
                        <select class="attributeSelect">
                            <option>
                                Square Blinking
                            </option>
                            <option>
                                Triangle Blinking
                            </option>
                        </select>
                    </td>
                    <td class="attribute-unit">
                    </td>
                </div>
                <div v-for="slot in slots" v-bind:key="'s_'+slot"
                    v-bind:class="{hideDisplay:!shouldDisplayField(node.operation, 'slots')}">

                    <td class="attribute-title"> {{slot}} </td>
                    <br/>
                    <td class="attribute-info">
                        <select class="attributeSelect">
                            <option v-for="led in leds" v-bind:key="led">
                                {{ led }}
                            </option>
                        </select>
                    </td>
                    <td class="attribute-unit">
                    </td>
                </div>

            </li>

        </ul>
    </div>
</template>

<script>
    import { Chrome } from 'vue-color'
    import ColorPreview from "./ColorPreview";
    import { log } from 'util';

    function clamp(num, min, max) {
        return num <= min ? min : num >= max ? max : num;
    }

    function precise(x) {
        return Number.parseFloat(x).toPrecision(3);
    }

    let defaultColors = {
        hex: '#194d33e6',
        hsl: {
            h: 150,
            s: 0.5,
            l: 0.2,
            a: 0.9
        },
        hsv: {
            h: 150,
            s: 0.66,
            v: 0.30,
            a: 0.9
        },
        rgba: {
            r: 25,
            g: 77,
            b: 51,
            a: 0.9
        },
        a: 0.9
    }

    export default {
        components: {
            ColorPreview,
            'chrome-picker': Chrome
        },
        props: ["leds", "projectSettings"],
        data() {
            return {
                colors: defaultColors,
                isDisplaying: false,
                hexColorIsGood: false,
                node: {},
                slots: [
                    "Slot 1",
                    "Slot 2"
                ],
                operations: [{
                        text: 'Transition',
                        value: 'transition',
                        fields: [
                            "led",
                            "startValue",
                            "endValue",
                            "duration",
                            "mode",
                            "targetColor"
                        ]
                    },
                    {
                        text: 'Delay',
                        value: 'delay',
                        fields: [
                            "duration"
                        ]

                    }, {
                        text: 'Step',
                        value: 'step',
                        fields: [
                            "led",
                            "startValue",
                            "endValue",
                            "targetColor"
                        ]

                    },
                    {
                        text: 'Primitive',
                        value: 'primitive',
                        fields: [
                            "slots"
                        ]

                    }
                ],
                modes: [{
                        text: 'Linear',
                        value: '1'
                    },
                    {
                        text: 'Exponential',
                        value: '2'
                    },
                    {
                        text: 'Sigmoid',
                        value: '3'
                    },
                    {
                        text: 'Cubic',
                        value: '4' 
                    }
                ]
            }
        },
        computed: {
            quantizedBrightness: function () {
                var steps = Math.pow(2, this.projectSettings.bit_depth);
                let count = Math.round((this.node.endValue * (steps - 1)) / 100);
                let output = Math.floor(clamp(count * (256 / (steps - 1)), 0, 255));
                let percent = precise((100 * output) / 255);
                return percent;
            }
            
        },
        methods: {
            updateValue () {

                let rgb = {
                    'red': this.colors.rgba.r,
                    'green': this.colors.rgba.g,
                    'blue': this.colors.rgba.b

                }
                this.node.targetColor = this.colors.hex;
                this.node.target_color = rgb;

                this.brightnessCorrectedColor();
                
                // block not runing
                 const parse = (alpha) => {
                    let b = alpha.toFixed(2)
                    let a = b.toString();

                    if(0.10 > alpha){
                        return parseInt(a.substring(3, a.length));

                    } else if (alpha === NaN){
                        return 0

                    } else if (alpha === 1){

                        return 100;

                    } else {
                        return parseInt(a.substring(2, a.length));

                    }

                    

                }
                this.node.endValue = parse(this.colors.a);

            },
            brightnessCorrectedColor: function () {
                // Gonna suck... text to hex to text...? seems silly
                // Check the color validity
                this.hexColorIsGood = /(^#[0-9A-F]{6}$)/i.test(this.node.targetColor);
                

                if (false == this.hexColorIsGood) {
                    this.$set(this.node.errors, 'hex', "Bad Color Definition");
                    console.log(this.node.errors);
                    return; // Whatever... 
                }

                // Clean out any hex errors
                if ('hex' in this.node.errors) {
                    this.$delete(this.node.errors, 'hex');
                }

                // Do this once, as it's an actively calculated variable
                let brightness = this.quantizedBrightness * 0.01;

                // Parse it out
                let rgb = [
                    Math.round(brightness * parseInt(this.node.targetColor.substr(1, 2), 16)),
                    Math.round(brightness * parseInt(this.node.targetColor.substr(3, 2), 16)),
                    Math.round(brightness * parseInt(this.node.targetColor.substr(5, 2), 16))
                ];

                let result = '#'; //+ rgb[0].toString(16) + rgb[1].toString(16) + rgb[2].toString(16)

                for (let i = 0; i < rgb.length; i++) {
                    let hexConvertStr = "00" + rgb[i].toString(16);
                    let hexStr = hexConvertStr.substring(hexConvertStr.length - 2, hexConvertStr.length);
                    result += hexStr;
                }
                this.node['resultingColor'] = result;

                return result;
            },
            show(_node) {
                this.$set(this.$data, 'node', _node);   
        
                this.colors = {
                    hex: _node.targetColor

                }


                
                
                this.isDisplaying = true;
                console.log("Editing Node: " + this.node.id);
            },
            hide() {
                this.isDisplaying = false;
            },
            deleteMe() {

                const me = this;
                this.$modal.show('dialog', {
                    title: 'Delete Node?',
                    text: 'This cannot be undone.',
                    buttons: [{
                            title: 'I\'m Cool With That',
                            default: true,
                            handler: () => {
                                // me.$parent.deleteNode(this.node.id);
                                me.$emit('deleteNode', this.node.id);
                                me.$modal.hide('dialog');
                                me.hide();
                            }
                        },
                        {
                            title: 'Cancel'
                        }
                    ]
                })
            },
            shouldDisplayField(_operation, _key) {
                for (var x = 0; x < this.operations.length; x++) {
                    if (_operation == this.operations[x].value) {
                        var arr = this.operations[x].fields
                        for (var i = 0; i < arr.length; i++) {
                            if (arr[i] == _key) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            }
        }
    }
</script>

<style>
    .vc-chrome-alpha-wrap{
        display: none;
    }
    .vc-chrome-hue-wrap {
        top: 10px;
    }

    #ledColor{
        margin-bottom: 230px;

    }
    .colorBox{
        width: 12.5em;
        padding-top: 5px;
        margin-bottom: 9px;
        height: 4vh;
    }

    #hex-input{
        position: absolute;
        left: 8px;
    }

    .vc-input__input {
        color: #fff !important;
    }

    /* #hex-input-border:focus{
        outline: none;
        box-shadow: 0px 0px 16px orange;
    } */

    .attribute-container {
        position: relative;
        min-height: 10rem;
        width: 100%;
        left: 0px;
        /* padding-left: 0.5rem; */
        background: black;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
        text-align: center;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }

    .project-settings-header {
        width: 100%;

        padding-left: 0.5rem;
    }

    .box-title {
        position: relative;
        /* left: 0.5rem; */
        padding-left: 0.5rem;
        /* top: 0.5rem; */
        text-align: left;
    }

    .marquee {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

    /* .attribute-title {
        width: 160px;
        text-align: right;
        padding: 3px;
    } */

    .attribute-table {
        position: relative;
        padding: 20px;
        left: 1vw;
        padding-top: 0px;
        /* transform: translateX(-50%); */
    }

    .attribute-info {
        /* padding: 3px; */
        width: 120px;
        padding-bottom: 10px;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }

    .attribute-unit {
        text-align: left;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }

    .attribute-container input {
        width: 100%;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }

    .attribute-container select {
        width: 200px;
        box-sizing: border-box;
        -moz-box-sizing: border-box;
        -webkit-box-sizing: border-box;
    }
    .timeInput:focus {
        outline: none;
        box-shadow: 0px 0px 16px orange;
    }   

    .hideDisplay {
        display: none;
    }

    .validInput {
        border: 1px solid red;
        border-radius: 5px;
        width: 12.5em;
        padding-top: 5px;
        margin-bottom: 9px;
        height: 4vh;
    }

    .attributeSelect {
        background: #333;
        height: 1.75rem;
        width: 100%;
        color: white;
    }
</style>

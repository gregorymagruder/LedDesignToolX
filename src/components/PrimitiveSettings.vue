<template>
    <div>
        <h3> PRIMITIVES </h3>

        <ul class="primitives-list" v-for="primitive in primitives" v-bind:key="'prm_' + primitive.name">
            <li>
                <!-- <div> -->
                <span>{{primitive.name}}</span>
                <!-- </div> -->
                <div class="primitives-tools">
                <i class="fi-pencil" />
                <i class="fi-plus" />
                </div>
            </li>
        </ul>

        <div class="tool-button primitives-add-btn"><i class="fi-plus"/></div>
    </div>
</template>

<script>
    const {
        dialog
    } = require('electron').remote

    export default {
        name: 'primitive-settings',
        data() {
            return {
                primitives: [{
                        name: "Square Blinking",
                    },
                    {
                        name: "Triangle Blinking",
                    }
                ]
            }
        },
        // mounted: function () {this.$nextTick(function(){this.loadAnimation()})},
        methods: {

        }
    }
</script>

<style>
.primitives-list {
    position: relative;
    padding: 0px 0px 0px 0px;
}
.primitives-tools {
    position: absolute;
    right: 0px;
    top: 0px;
}
.primitives-add-btn{
    background: #555;
    width: 100%;
}
</style>
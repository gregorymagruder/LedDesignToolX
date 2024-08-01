<template>
    <div class="colorPreview" v-bind:style="{background:hexColor}">
        &nbsp;
    </div>
</template>

<script>
    export default {
        name: 'ColorPreview',
        props: {'hexColor': {
            default: "#000"
        }},
    }
</script>

<style scoped>
    .colorPreview {
        position: relative;
        width: 16px;
        height: 16px;
        border: 1px solid white;
        border-radius: 50%;
        cursor: default;
        margin-left: 12px;
    }
</style>
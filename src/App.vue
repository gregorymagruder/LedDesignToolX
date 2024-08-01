<template>
    <div id="app">
        <Slideout ref="slideout" :touch="false" :toggleSelectors="['.toggle-button']">
            <Workspace />
        </Slideout>
        <v-dialog/>
        <vue-progress-bar/>
    </div>
</template>
<script>
    import Slideout from "vue-slideout";
    import Workspace from "./components/Workspace";
    export default {
        name: "workspace",
        components: {
            Workspace,
            Slideout,
        },
        mounted: function () {
            this.$refs.slideout.slideout.open();
        },
        methods: {}
    };
</script>
<style>
    body {
        width: 100%;
        height: 100%;
        margin: 0;
        font-weight: 200;
        font-family: 'Montserrat', sans-serif;
    }

    h3 {
        margin: 5px 0px 5px 0px;
    }
    
    .tooltip {
        /* transform: translate3d(0px, 116px, 0px) !important; */
        z-index: 1;
    }

    .tooltip-inner {
      background: #7f7f7f;
      color: white;
      padding: 5px;
      border-radius: 5px;
      box-shadow: 0 5px 20px rgba(black, .1);
    }
 

</style>
<template>
    <div v-on:click='onClick' class="window jtk-node" :id="node.id">
        <strong>{{ title }}</strong>
        <p/>
        <div>{{ action }}</div>
        <node-config-modal ref="NodeConfigModal" name="node-config-modal" />
    </div>
</template>

<script>
    import NodeConfigModal from './NodeConfigModal';

    export default {
        name: 'ViewNode',
        components: [
            NodeConfigModal
        ],
        props: ['node'],
        data() {
            return {
                title: 'Click to Configure',
                action: 'No Action',
            }
        },
        watch: {
            'node' () {
                // handler: function (_new, _old) {
                console.dir("Updated node info");
                this.title = ('led' in this.node) ? this.node['led'] : "Click to Configure";
                this.action = ('operation' in this.node) ? (('transition' in this.node) ? this.node.transition :
                        this.node.operation) :
                    "No Action";
                this.id = this.node.id;
            }
        },
        mounted: function () {
            console.dir("Updated node info");
            
            this.title = ('led' in this.node) ? this.node['led'] : "Click to Configure";
            this.action = ('operation' in this.node) ? (('transition' in this.node) ? this.node.transition :
                    this.node.operation) :
                "No Action";
            this.id = this.node.id;
        },
        methods: {
            onClick: function () {
                
                // Call the view modal here
                this.$refs.NodeConfigModal.show(this.node, {
                    draggable: true
                });
            }
        }
    }
</script>
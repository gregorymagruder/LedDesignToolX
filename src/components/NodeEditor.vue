<template>
    <div>
        <div id="jtkMain" class="jtk-main" v-on:click="processCanvasClick();"
            :class="{addNodeMode:inAddNodeMode}" >
            <div class="jtk-canvas canvas-wide flowchart-container jtk-surface jtk-surface-nopan" v-shortkey="['ctrl','d']" @shortkey="deleteUs" >
                <div id="canvas" ref="canvas">
                    <div v-for="node in nodes" :key="node.id" v-bind:class="{highlighted:node.highlighted}"
                        class="window jtk-node " :id="node.id" v-on:click="showLedConfigModal(node.id, $event)"
                        :style="node.position" >
                        <!-- Indicate Errors -->
                        <strong v-if="Object.keys(node.errors).length != 0" class="hasErrors"> ! </strong>
                        <div class="window noselect jtk-node safe orphan" v-if="(node.led == null || node.led == '') && node.operation != 'delay'">
                            <strong class="safe">Click to Configure</strong>
                        </div>
                        <div class="noselect" v-else>
                            <strong v-if="node.operation != 'delay'" style="width:100%;">
                                <color-preview :style="{position:'absolute', right:'5px', top:'5px'}"
                                    :hexColor="node.resultingColor" />
                                {{node.led}}</strong>
                            <div style="width:100%;">{{ node.duration }} ms </div>
                            <div> {{node.operation}}</div>
                        </div>
                    </div>
                    <div class="window jtk-node safe" id="nodeStart">
                        <strong class="safe">START</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import JSPConfig from '../config/jsp.config.js';
    import AttributeView from "./AttributeView";
    import ColorPreview from "./ColorPreview";
    import DragSelect from 'dragselect'
    import 'jquery-ui';
    import {
        log
    } from 'util';
import { SSL_OP_LEGACY_SERVER_CONNECT } from 'constants';

    const uuidv4 = require('uuid/v4');

    let last_position = {};

    export default {
        name: 'node-editor',
        components: {
            AttributeView,
            ColorPreview
        },
        props: ['nodes', 'leds', 'connections', 'projectSettings'],
        data() {
            return {
                jsp: null,
                didDrag: false,
                newNodeOffset: 80,
                inAddNodeMode: false,
                selectedNode: null,
                canvasActive: false,
                mouseX: 10,
                mouseY: 10,
                currentZoom: 1.0,
                canvasElement: null,
                last_position: {},
                ds: null,
                dragSelections: []
            }
        },
        watch: {
            nodes: function (_newVal, _oldVal) {
                this.$nextTick(function () {
                    this.initNodes();
                    this.syncNodes();
                    this.makeConnections(this.connections);
                    this.jsp.repaintEverything();
                });
            }
        },
        mounted: function () {
            var basePath = require('electron').remote.app.getAppPath();
            let jsplumb = require(basePath + '/src/vendor/jsplumb.js');
            const me = this;
            

            this.windowElement = document.querySelector('#jtkMain')
            this.canvasElement = document.querySelector('#canvas')

            // Handle mouse location
            document.addEventListener('mousemove',
                function (event) {
                    event = event || window.event;

                    function getMousePos(canvas, evt) {
                        var rect = canvas.getBoundingClientRect();
                        return {
                            x: evt.clientX - rect.left,
                            y: evt.clientY - rect.top
                        };
                    }

                    if ("jtkMain" === event.target.id || me.windowElement.contains(event.target)) {
                        var pos = getMousePos(me.canvasElement, event);

                        me.mouseX = Math.floor(pos.x / +me.currentZoom);
                        me.mouseY = Math.floor(pos.y / +me.currentZoom);
                        
                        me.canvasActive = true;
                    } else {
                        me.canvasActive = false;
                    }
                });

            // Handle local keypresses
            document.addEventListener('keydown', function (e) {
                if (e.key === "Delete") {
                    if (me.canvasActive) {
                        if (null != me.selectedNode) {
                            me.deleteNode(me.selectedNode);
                        }
                    }
                }

                if (e.key === "Escape"){
                    if(me.inAddNodeMode === true){
                        me.exitAddNodeMode()
                    }
                }
            });


            var instance;
            // plumb is instance
            var $container = $(".jtk-main");
            var $panzoom = $container.find('.jtk-canvas');

            // Load up jsPlumb library
            jsPlumb.ready(function () {
                console.log("[JSPlumb] Ready...");
                instance = window.jsp = me.jsp = jsPlumb.getInstance({
                    DragOptions: JSPConfig.DragOptions,
                    Container: "canvas"
                });

                var basicType = {
                    connector: "StateMachine",
                    paintStyle: {
                        stroke: "red",
                        strokeWidth: 4
                    },
                    hoverPaintStyle: {
                        stroke: "blue"
                    },
                    overlays: [
                        "Arrow"
                    ]
                };

                $panzoom.panzoom({
                        minScale: 0.4,
                        maxScale: 2,
                        increment: 0.1,
                        cursor: "",
                        ignoreChildrensEvents: true,
                    }).on("panzoomstart", function (e, pz, ev) {
                        $panzoom.css("cursor", "move");
                    })
                    .on("panzoomend", function (e, pz) {
                        $panzoom.css("cursor", "");
                    });

                $panzoom.on('panzoomzoom', (e, obj, scale) => {
                    me.currentZoom = scale;
                    
                    me.jsp.setZoom(scale);
                });

                $panzoom.parent()
                    .on('mousewheel.focal', function (e) {
                        if (e.ctrlKey || e.originalEvent.ctrlKey) {
                            e.preventDefault();
        
                            var delta = e.delta || e.originalEvent.wheelDelta;
                            var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;

                            $panzoom.panzoom('zoom', zoomOut, {
                                animate: true,
                                relative: true,
                                focal: e
                            });

                        } else {
                            e.preventDefault();
                            
                            var deltaY = e.deltaY || e.originalEvent.wheelDeltaY || (-e.originalEvent
                                .deltaY);
                            var deltaX = e.deltaX || e.originalEvent.wheelDeltaX || (-e.originalEvent
                                .deltaX);


                            $panzoom.panzoom("pan", deltaX / 2, deltaY / 2, {
                                animate: true,
                                relative: true,
                            });
                        }
                    })
                    .on('mousemove', function (e) {
                        if(e.which === 2){
                            
                            e.preventDefault();
                               //set the new last position to the current for next time

                               if (typeof(last_position.x) != 'undefined') {
                                    var deltaX = last_position.x - e.offsetX,
                                        deltaY = last_position.y - e.offsetY;

                                    $panzoom.panzoom("pan", deltaX / 2, deltaY / 2, {
                                        animate: true,
                                        relative: true,
                                    });
                                        
                                }
                                last_position = {
                                    x : e.offsetX,
                                    y : e.offsetY
                                };

                        }
                        
                    })
                    .on("mousedown touchstart", function (ev) {
                        var matrix = $container.find(".panzoom").panzoom("getMatrix");
                        var offsetX = matrix[4];
                        var offsetY = matrix[5];
                        var dragstart = {
                            x: ev.pageX,
                            y: ev.pageY,
                            dx: offsetX,
                            dy: offsetY
                        };
                        $(ev.target).css("cursor", "move");
                        $(this).data('dragstart', dragstart);
                    })
                    .on("mousemove touchmove", function (ev) {
                        var dragstart = $(this).data('dragstart');
                        if (dragstart) {
                            var deltaX = dragstart.x - ev.pageX;
                            var deltaY = dragstart.y - ev.pageY;
                            var matrix = $container.find(".panzoom").panzoom("getMatrix");
                            matrix[4] = parseInt(dragstart.dx) - deltaX;
                            matrix[5] = parseInt(dragstart.dy) - deltaY;
                            $container.find(".panzoom").panzoom("setMatrix", matrix);
                        }
                    })
                    .on("mouseup touchend touchcancel", function (ev) {
                        $(this).data('dragstart', null);
                        $(ev.target).css("cursor", "");
                    });

                instance.registerConnectionType("basic", basicType);
                instance.batch(function () {
                    me.addEndpoints("nodeStart", ["RightMiddle"], []);

                    instance.bind("connection", function (connInfo, originalEvent) {
                        if (undefined == originalEvent) {
                            return; // No original event if we're loading connections
                        }
                        
                        me.refreshConnections();
                    });
                    instance.bind("connectionDetached", function (conn, originalEvent) {
                        if (undefined == originalEvent) {
                            return; // No original event if we're loading connections
                        }
                        
                        me.refreshConnections();
                    });
                    instance.bind("click", function (conn, originalEvent) {
                        if (undefined == originalEvent) {
                            return; // No original event if we're loading connections
                        }

                        // for (const key in me.connections) {
                        //     if(me.connections[key]['target']['id'] === conn.targetId){

                        //         const temp = me.connections.filter(a => {  
                        //             return a !== me.connections[key];
                        //         });

                        //         me.connections = temp
                                
                        //     }
                            
                        // }

                        instance.deleteConnection(conn);
                        me.refreshConnections();
                        
                    });
                });
            });
        },
        methods: {
           deleteUs: function () {
                if(this.dragSelections.length >= 2){
                    for (const node of this.dragSelections) {
                        this.deleteNode(node.id);
                    }
                };
            },
            initNodes: function () {
 
                // Initialize any existing nodes
                for (var key in this.nodes) {
                    this.finalizeNode(key);
                }
            },
            syncNodes: function () {
                const me = this;
                this.jsp.selectEndpoints().each(function (endpoint) {
                    var element = endpoint.getElement();
                    var id = element.id;
                    if (!(id in me.nodes || "nodeStart" == id)) {
                        console.log("Deleting Node ID: %s", id);
                        me.jsp.remove(id);
                    }
                });
            },
            refreshConnections: function () {
                var srcConnArray = this.jsp.getConnections();
                console.log(srcConnArray);
                var dstConnArray = [];
                for (var i = 0; i < srcConnArray.length; i++) {
                    dstConnArray.push({
                        source: {
                            id: srcConnArray[i].source.id
                        },
                        target: {
                            id: srcConnArray[i].target.id
                        }
                    })
                }
                
                this.$emit('update:connections', dstConnArray);
                this.nodeUpdated();
            },
            enterAddNodeMode: function () {
                this.inAddNodeMode = true;
            },
            exitAddNodeMode: function () {
                this.inAddNodeMode = false;
            },
            processCanvasClick: function () {
                this.hideLedConfigModal();

                if (true === this.inAddNodeMode) {
            
                    this.addNode(null, "pointer");
                    this.exitAddNodeMode();
                } else {

                    
                    this.deselectNodes(this.nodes);
                }
            },
            addNode: function (_node, _location, _n) {
                let location = "";
                
                switch (_location) {
                    case "pointer":
                        
                        // Set location
                        location = "left: " + (this.mouseX - 46) + "px; top:" + (this.mouseY - 46) + "px;";
                        break;
                    case "paste":
                        // can't really figure out the math to make it percise
                        // _n.left _n.top  were the original locations
                        location = "left: " + (this.mouseX) + "px; top:" + (this.mouseY) + "px;";
                        break;

                    default:
                        
                        location = "left: " + this.newNodeOffset + "px; top:20px;";
                        // Offset every new node; keep it in the context of current work session
                        // could be smarter by checking areas and not writing over, but seems 
                        // like a waste of time compared with more useful features. 
                        this.newNodeOffset += 20;
                        break;
                }
                
                
                // Create a new node if none sent
                // I think it would be better to move this into a new component
                // for ease of development (Node.vue)
                // Constants should be in there, as well
                if (null == _node) {
                    _node = {
                        id: uuidv4(),
                        led: "",
                        operation: "transition",
                        startValue: 0,
                        endValue: 100,
                        targetColor: "#ffffff",
                        target_color:  {
                        'red' : 255,
                        'green': 255,
                        'blue': 255,
                        },
                        resultingColor: "#ffffff",
                        mode: 1,
                        duration: 1000,
                        highlighted: false,
                        position: location,
                        errors: {}
                    }
                    
                    this.$set(this.nodes, _node.id, _node);
                } else {
                    if(this.nodes[_n.id] != undefined) {

                        let id = uuidv4()
                        const clean = (src) => {
                            return Object.assign({}, src);
                        }

                        let _node = clean(this.nodes[_n.id]);


                        _node.id = id
                        _node.position = location

                        this.$set(this.nodes, id, _node);
                    } else {
                    
                        let _node = this.cache.filter(node => node.id === _n.id)[0]
                         _node.id = uuidv4()
                         _node.position = location

                         this.$set(this.nodes, _node.id, _node);
                    }
                    

                }
            },
            finalizeNode: function (_nodeId) {
                if (null == _nodeId) {
                    return;
                }
                if (this.jsp) {
                    var element = document.getElementById(_nodeId);
                    const me = this;
                    this.jsp.draggable(element, {
                        grid: [20, 20],
                        drag: function (event) {
                            var positionStyle = "left: " + event.pos[0] + "px; top:" +
                                event.pos[1] + "px;"
                            me.didDrag = true;
                            me.nodes[event.el.id]['position'] = positionStyle;
                        }
                    });

                    if (null != element) {
                        this.addEndpoints(_nodeId, ["RightMiddle"], ["LeftMiddle"]);
                    }

                // MuliSelect 
                    const selector = document.createElement('div');
                    selector.setAttribute("id", "selector");

                    $(".workspace").append(selector);
                    this.ds = new DragSelect({
                        selectables: document.querySelectorAll('.jtk-node'),
                        selector: document.getElementById('selector'),
                        onElementSelect: e => { 
                            this.jsp.addToDragSelection(e);
                            this.dragSelections.push(e);
                            $(e).css("border-color","red");

                            
                            
                            
                        
                        },
                        onElementUnselect: e => {
                            $(e).css("border-color","#346789");

                            let r = this.dragSelections.indexOf(e);
        
                            if (r > -1) {
                               this.dragSelections.splice(r, 1);
                            }
                            
                            this.jsp.clearDragSelection();
                        },
                        onDragMove: e => {
                            
                            if(e.srcElement.className != 'jtk-main'){
                                this.ds.break();
                            }
    
                            
                        },
                        onDragMove: e => {
                            if(e.srcElement.className != 'jtk-main'){

                                try {
                                                                    
                                    if(e.srcElement.className.includes("safe")){
                                        this.ds.start();
                                        
                                    }else{
                                        this.ds.break();

                                    }
                                }  catch (err) {
                                // console.log(err);
                                    
                                }
            
                            } 

                        },
                    });

                }
            },
            deleteNode: function (_id) {
                console.log("Deleting: %s", _id)
                this.jsp.remove(_id);
                this.$delete(this.nodes, _id);
            },
            // TODO: DOESN'T WORK!
            deselectNodes: function (obj) {
                Object.keys(obj).forEach(key => {     
                    if (key === 'highlighted') {
                            obj.highlighted = false;
                        }
                    if (typeof obj[key] === 'object') {
                            this.deselectNodes(obj[key])
                        }
                    })
            },
            makeConnections: function (_connections) {
                this.jsp.deleteEveryConnection();
                for (var i = 0; i < _connections.length; i++) {                   
                    if ((_connections[i].source.id) && (_connections[i].target.id)) {

                        
                        try {
                            let js = this.jsp.connect({
                                source: _connections[i].source.id,
                                target: _connections[i].target.id,
                                uuids: [_connections[i].source.id + "RightMiddle", _connections[i].target
                                    .id +
                                    "LeftMiddle"
                                ],
                                editable: true
                            });

                            if (typeof js != 'object') {
                            
                                // delete _connections[i - 1]
                                delete _connections[i]
                        
                                this.refreshConnections()
                                this.makeConnections(_connections)
                            }

                
                        } catch (err) {
                            console.log("Caught a connection making bug. Let it go.");
                        }
                    }
                }
            },
            addEndpoints: function (toId, sourceAnchors, targetAnchors) {
                for (var i = 0; i < sourceAnchors.length; i++) {
                    var sourceUUID = toId + sourceAnchors[i];
                    this.jsp.addEndpoint(toId, JSPConfig.sourceEndpoint, {
                        anchor: sourceAnchors[i],
                        uuid: sourceUUID
                    });
                }
                for (var j = 0; j < targetAnchors.length; j++) {
                    var targetUUID = toId + targetAnchors[j];
                    this.jsp.addEndpoint(toId, JSPConfig.targetEndpoint, {
                        anchor: targetAnchors[j],
                        uuid: targetUUID
                    });
                }
            },
            showLedConfigModal(_nodeId, _event) {
                if (_event) {
                    _event.stopPropagation();
                }

                this.selectedNode = _nodeId;

                this.nodes[_nodeId]['highlighted'] = true;
                

                
                // this.$refs.AttributeView.show(this.nodes[_nodeId]);
                this.$emit('showAttributes', this.nodes[_nodeId]);
                
            },
            hideLedConfigModal() {
                this.selectedNode = null;

                // this.$refs.AttributeView.hide();
                this.$emit('hideAttributes');
            },
            nodeUpdated() {
                this.$nextTick(function () {
                    this.$emit('compile');
                })
            },
         
        }
    }
</script>

<style>
    @import 'assets/css/jsplumbtoolkit.css';

    .orphan {
        box-shadow: 0px 0px 30px red !important;
    }
    
    #selector {
        position: absolute;
        background-color: rgba(0, 0, 255, 0.1);
        border: 1px solid rgba(0, 0, 255, 0.45);
        display: none;
        pointer-events: none;
        left: 0px;
        top: 0px;
        z-index: 50;
    }

    #nodeStart {
        top: 15em;
        left: 3em;
        color: #eee !important;
        border-color: #eee !important;
        border-width: 6px !important;
        width: 50px !important;
        height: 50px !important;
        border-radius: 50px !important;
        background-color: #000 !important;
        background: #000 !important;
    }

    /* .attr-container {
        position: absolute;
        left: 0px;
        bottom: 0px;
        width: 100%;
        height: 32%;
        overflow-y: scroll;
    } */

    li {
        list-style-type: none;
    }

    .edit:hover {
        color: #ff8000;
    }

    .selected-mode {
        color: #E4F013;
    }

    .connect {
        width: 10px;
        height: 10px;
        background-color: #f76258;
        position: absolute;
        bottom: 13px;
        right: 5px;
    }

    .highlighted {
        box-shadow: 0px 0px 30px #4f4 !important;
    }

    .hasErrors {
        background: red !important;
        color: white !important;
        width: 16px;
        height: 16px;
        font-size: 12px;
        text-align: center;
        border-radius: 8px;
        position: absolute;
        left: 5px;
        top: 5px;
    }

    .addNodeMode {
        cursor: crosshair
    }
    .noselect {
        user-select: none;
    }
        
</style>
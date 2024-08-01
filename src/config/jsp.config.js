var JSPConfig = {
    // the definition of source endpoints (the small blue ones)
    hiddenEndpoint: {
        endpoint: "Dot",
        paintStyle: {
            stroke: "transparent",
            fill: "transparent",
            radius: 0,
            strokeWidth: 0
        },
        isSource: true,
        connector: ["Flowchart", {
            stub: [40, 60],
            gap: 10,
            cornerRadius: 5,
            alwaysRespectStubs: true
        }],
        connectorStyle: {
            strokeWidth: 0,
            stroke: "transparent",
            joinstyle: "round",
            outlineStroke: "transparent",
            outlineWidth: 0
        },
        hoverPaintStyle: {
            fill: "transparent",
            stroke: "transparent"
        },
        connectorHoverStyle: {
            strokeWidth: 0,
            stroke: "transparent",
            outlineWidth: 0,
            outlineStroke: "transparent"
        },
        dragOptions: {},
        overlays: [
            ["Label", {
                location: [0.5, 1.5],
                label: "Drag",
                cssClass: "endpointSourceLabel",
                visible: false
            }]
        ],
        maxConnections: -1
    },
    sourceEndpoint: {
        endpoint: "Dot",
        paintStyle: {
            stroke: "#7AB02C",
            fill: "transparent",
            radius: 7,
            strokeWidth: 1
        },
        isSource: true,
        connector: ["Flowchart", {
            stub: [40, 60],
            gap: 10,
            cornerRadius: 5,
            alwaysRespectStubs: true
        }],
        connectorStyle: {
            strokeWidth: 2,
            stroke: "#61B7CF",
            joinstyle: "round",
            outlineStroke: "black",
            outlineWidth: 2
        },
        hoverPaintStyle: {
            fill: "#216477",
            stroke: "#216477"
        },
        connectorHoverStyle: {
            strokeWidth: 3,
            stroke: "#f00",
            outlineWidth: 2,
            outlineStroke: "white"
        },
        dragOptions: {},
        overlays: [
            ["Label", {
                location: [0.5, 1.5],
                label: "Drag",
                cssClass: "endpointSourceLabel",
                visible: false
            }]
        ],
        maxConnections: -1
    },
    // the definition of target endpoints (will appear when the user drags a connection)
    targetEndpoint: {
        endpoint: "Dot",
        paintStyle: {
            fill: "#7AB02C",
            radius: 7
        },
        hoverPaintStyle: {
            fill: "#216477",
            stroke: "#216477"
        },
        maxConnections: 1,
        dropOptions: {
            hoverClass: "hover",
            activeClass: "active"
        },
        isTarget: true,
        overlays: [
            ["Label", {
                location: [0.5, -0.5],
                label: "Drop",
                cssClass: "endpointTargetLabel",
                visible: false
            }]
        ]
    },
    DragOptions: {
        cursor: 'pointer',
        zIndex: 2000
    }
}

export default JSPConfig;
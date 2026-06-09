const leafletStyleId = "evnt-leaflet-web-styles";

const leafletStyles = `
.leaflet-container{background:#dbe4ee;font-family:inherit;overflow:hidden;position:relative;touch-action:none;width:100%;height:100%}
.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{left:0;position:absolute;top:0}
.leaflet-container img.leaflet-tile,.leaflet-container img.leaflet-marker-icon,.leaflet-container img.leaflet-marker-shadow{max-height:none!important;max-width:none!important}
.leaflet-tile{border:0;filter:inherit;user-select:none;visibility:hidden}
.leaflet-tile-loaded{visibility:inherit}
.leaflet-zoom-animated{transform-origin:0 0}
.leaflet-marker-icon,.leaflet-marker-shadow{display:block}
.leaflet-tile-pane{z-index:200}.leaflet-overlay-pane{z-index:400}.leaflet-shadow-pane{z-index:500}.leaflet-marker-pane{z-index:600}.leaflet-tooltip-pane{z-index:650}.leaflet-popup-pane{z-index:700}
.leaflet-map-pane canvas{z-index:100}.leaflet-map-pane svg{z-index:200}
.leaflet-vml-shape{height:1px;width:1px}
.lvml{behavior:url(#default#VML);display:inline-block;position:absolute}
.leaflet-control-container .leaflet-top,.leaflet-control-container .leaflet-bottom{pointer-events:none;position:absolute;z-index:1000}
.leaflet-top{top:0}.leaflet-right{right:0}.leaflet-bottom{bottom:0}.leaflet-left{left:0}
.leaflet-control{clear:both;float:left;pointer-events:auto;position:relative;z-index:800}
.leaflet-right .leaflet-control{float:right}
.leaflet-top .leaflet-control{margin-top:10px}.leaflet-bottom .leaflet-control{margin-bottom:10px}.leaflet-left .leaflet-control{margin-left:10px}.leaflet-right .leaflet-control{margin-right:10px}
.leaflet-control-attribution{background:rgba(255,255,255,.82);color:#64748b;font-size:10px;line-height:1.3;margin:0;padding:2px 6px}
.leaflet-control-attribution a{color:#334155;text-decoration:none}
.leaflet-interactive{cursor:pointer}
.leaflet-grab{cursor:grab}.leaflet-dragging .leaflet-grab{cursor:move}
`;

export function ensureLeafletStyles() {
  if (typeof document === "undefined" || document.getElementById(leafletStyleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = leafletStyleId;
  style.textContent = leafletStyles;
  document.head.appendChild(style);
}

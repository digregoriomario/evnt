import L, { type Map as LeafletMap, type Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { createElement, useEffect, useRef, type CSSProperties } from "react";
import { StyleSheet, View } from "react-native";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { radius } from "../theme";
import { EvntEvent } from "../types";

type EventMiniMapProps = {
  event: EvntEvent;
};

const leafletStyle: CSSProperties = {
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
  width: "100%"
};

function toLatLng(event: EvntEvent): [number, number] {
  return [event.coordinates.latitude, event.coordinates.longitude];
}

function createEventIcon(event: EvntEvent) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];

  return L.divIcon({
    className: "evnt-detail-marker",
    html: `<div style="
      align-items:center;
      background:${soft};
      border:2px solid ${accent};
      border-radius:999px;
      box-shadow:0 8px 18px rgba(17,24,39,0.20);
      display:flex;
      height:38px;
      justify-content:center;
      line-height:38px;
      width:38px;
    "><span style="font-size:19px;line-height:1">${emoji}</span></div>`,
    iconAnchor: [19, 19],
    iconSize: [38, 38]
  });
}

export function EventMiniMap({ event }: EventMiniMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      touchZoom: false,
      zoomControl: false
    }).setView(toLatLng(event), 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markerRef.current?.remove();
    markerRef.current = L.marker(toLatLng(event), {
      icon: createEventIcon(event),
      interactive: false,
      title: event.title
    }).addTo(map);

    map.setView(toLatLng(event), 15, { animate: true });
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [event]);

  return (
    <View style={styles.map}>
      {createElement("div", { ref: mapElementRef, style: leafletStyle })}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: radius.sm,
    height: 132,
    overflow: "hidden",
    position: "relative",
    width: "100%"
  }
});

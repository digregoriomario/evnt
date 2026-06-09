import { Ionicons } from "@expo/vector-icons";
import L, { type Map as LeafletMap, type Marker as LeafletMarker } from "leaflet";
import { createElement, useEffect, useRef, type CSSProperties } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { ensureLeafletStyles } from "../styles/leafletWeb";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, Coordinates } from "../types";

type PlacePickerMapProps = {
  category: Category;
  coordinates?: Coordinates;
  fallbackCoordinates?: Coordinates;
  fullscreen?: boolean;
  onChange: (coordinates: Coordinates) => void;
  onClose?: () => void;
  onExpand?: () => void;
};

const defaultCoordinates: Coordinates = { latitude: 40.6815, longitude: 14.761 };
const leafletStyle: CSSProperties = {
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
  width: "100%"
};

function toLatLng(coordinates: Coordinates): [number, number] {
  return [coordinates.latitude, coordinates.longitude];
}

function createPlaceIcon(category: Category) {
  const accent = categoryColors[category];
  const emoji = categoryEmojis[category];
  const soft = categorySoftColors[category];

  return L.divIcon({
    className: "evnt-place-marker",
    html: `<div style="
      align-items:center;
      background:${soft};
      border:2px solid ${accent};
      border-radius:999px;
      box-shadow:0 8px 18px rgba(17,24,39,0.20);
      cursor:grab;
      display:flex;
      height:42px;
      justify-content:center;
      line-height:42px;
      width:42px;
    "><span style="font-size:20px;line-height:1">${emoji}</span></div>`,
    iconAnchor: [21, 21],
    iconSize: [42, 42]
  });
}

function fromLeafletLatLng(latlng: L.LatLng): Coordinates {
  return {
    latitude: latlng.lat,
    longitude: latlng.lng
  };
}

export function PlacePickerMap({
  category,
  coordinates,
  fallbackCoordinates,
  fullscreen = false,
  onChange,
  onClose,
  onExpand
}: PlacePickerMapProps) {
  const insets = useSafeAreaInsets();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const center = coordinates ?? fallbackCoordinates ?? defaultCoordinates;
  const controlTop = fullscreen ? Math.max(spacing.lg, insets.top + spacing.md) : spacing.md;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    ensureLeafletStyles();
    const map = L.map(mapElementRef.current, {
      attributionControl: false,
      scrollWheelZoom: true,
      zoomControl: false
    }).setView(toLatLng(center), fullscreen ? 16 : 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    map.on("click", (event) => onChangeRef.current(fromLeafletLatLng(event.latlng)));
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
    markerRef.current = L.marker(toLatLng(center), {
      draggable: true,
      icon: createPlaceIcon(category),
      title: "Luogo evento"
    }).addTo(map);
    markerRef.current.on("dragend", () => {
      const latlng = markerRef.current?.getLatLng();
      if (latlng) {
        onChangeRef.current(fromLeafletLatLng(latlng));
      }
    });

    map.setView(toLatLng(center), map.getZoom(), { animate: true });
    window.setTimeout(() => map.invalidateSize(), 0);
  }, [category, center.latitude, center.longitude]);

  return (
    <View style={[styles.frame, fullscreen && styles.fullscreenFrame]}>
      {createElement("div", { ref: mapElementRef, style: leafletStyle })}
      <View style={[styles.hint, fullscreen && { top: controlTop }]}>
        <Text style={styles.hintText}>Sposta il POI o tocca la mappa</Text>
      </View>
      {onExpand && !fullscreen ? (
        <Pressable
          accessibilityLabel="Ingrandisci minimappa luogo"
          accessibilityRole="button"
          onPress={onExpand}
          style={[styles.mapButton, { top: controlTop }]}
        >
          <Ionicons color={colors.ink} name="expand-outline" size={18} />
        </Pressable>
      ) : null}
      {onClose && fullscreen ? (
        <Pressable
          accessibilityLabel="Chiudi minimappa luogo"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.mapButton, { top: controlTop }]}
        >
          <Ionicons color={colors.ink} name="contract-outline" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 190,
    overflow: "hidden",
    position: "relative",
    width: "100%",
    ...shadow
  },
  fullscreenFrame: {
    borderRadius: 0,
    flex: 1,
    height: undefined
  },
  hint: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.sm,
    left: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute",
    top: spacing.md
  },
  hintText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  mapButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 40,
    ...shadow
  }
});

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
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

type CoordinateEvent = {
  nativeEvent: {
    coordinate: Coordinates;
  };
};

const defaultCoordinates: Coordinates = { latitude: 40.6815, longitude: 14.761 };

function regionFromCoordinates(coordinates: Coordinates, fullscreen = false): Region {
  return {
    latitude: coordinates.latitude,
    latitudeDelta: fullscreen ? 0.018 : 0.028,
    longitude: coordinates.longitude,
    longitudeDelta: fullscreen ? 0.018 : 0.028
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
  const mapRef = useRef<MapView | null>(null);
  const center = coordinates ?? fallbackCoordinates ?? defaultCoordinates;
  const accent = categoryColors[category];
  const emoji = categoryEmojis[category];
  const soft = categorySoftColors[category];
  const controlTop = fullscreen ? Math.max(spacing.lg, insets.top + spacing.md) : spacing.md;

  const handleCoordinate = (event: CoordinateEvent) => {
    onChange(event.nativeEvent.coordinate);
  };

  useEffect(() => {
    mapRef.current?.animateToRegion(regionFromCoordinates(center, fullscreen), 250);
  }, [center.latitude, center.longitude, fullscreen]);

  return (
    <View style={[styles.frame, fullscreen && styles.fullscreenFrame]}>
      <MapView
        initialRegion={regionFromCoordinates(center, fullscreen)}
        onPress={handleCoordinate}
        ref={mapRef}
        showsCompass={false}
        showsMyLocationButton={false}
        style={styles.map}
        userInterfaceStyle="light"
      >
        <Marker
          coordinate={center}
          draggable
          onDragEnd={handleCoordinate}
        >
          <View style={[styles.marker, { backgroundColor: soft, borderColor: accent }]}>
            <Text style={styles.markerEmoji}>{emoji}</Text>
          </View>
        </Marker>
      </MapView>
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
  map: {
    ...StyleSheet.absoluteFillObject
  },
  marker: {
    alignItems: "center",
    borderRadius: 21,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 42
  },
  markerEmoji: {
    fontSize: 20,
    lineHeight: 24
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

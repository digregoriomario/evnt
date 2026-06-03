import { Text, StyleSheet, View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { radius } from "../theme";
import { EvntEvent } from "../types";

type EventMiniMapProps = {
  event: EvntEvent;
};

function regionFromEvent(event: EvntEvent): Region {
  return {
    latitude: event.coordinates.latitude,
    latitudeDelta: 0.012,
    longitude: event.coordinates.longitude,
    longitudeDelta: 0.012
  };
}

export function EventMiniMap({ event }: EventMiniMapProps) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];

  return (
    <MapView
      initialRegion={regionFromEvent(event)}
      pitchEnabled={false}
      rotateEnabled={false}
      scrollEnabled={false}
      showsCompass={false}
      style={styles.map}
      userInterfaceStyle="light"
      zoomEnabled={false}
    >
      <Marker coordinate={event.coordinates}>
        <View style={[styles.marker, { backgroundColor: soft, borderColor: accent }]}>
          <Text style={styles.markerEmoji}>{emoji}</Text>
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    borderRadius: radius.sm,
    height: 132,
    overflow: "hidden",
    width: "100%"
  },
  marker: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  markerEmoji: {
    fontSize: 18,
    lineHeight: 22
  }
});

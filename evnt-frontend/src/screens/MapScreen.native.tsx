import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, type LatLng, type Region } from "react-native-maps";

import { CategoryChip } from "../components/CategoryChip";
import { categories, categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, EvntEvent } from "../types";

type MapScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  registrations: Set<string>;
  onOpenEvent: (event: EvntEvent) => void;
  onToggleFavorite: (eventId: string) => void;
};

type LocationStatus = "loading" | "granted" | "denied" | "unavailable";
type RadiusOption = 1 | 3 | 5 | 10 | 25;

const defaultRegion: Region = {
  latitude: 40.6815,
  latitudeDelta: 0.06,
  longitude: 14.761,
  longitudeDelta: 0.06
};

const mapEdgePadding = {
  bottom: 190,
  left: 44,
  right: 44,
  top: 72
};

const radiusOptions: RadiusOption[] = [1, 3, 5, 10, 25];

function regionFromCoordinates(coordinates: LatLng, delta = 0.035): Region {
  return {
    latitude: coordinates.latitude,
    latitudeDelta: delta,
    longitude: coordinates.longitude,
    longitudeDelta: delta
  };
}

function regionFromRadius(coordinates: LatLng, radiusKm: number): Region {
  const delta = Math.max(0.018, (radiusKm * 2.6) / 111);
  return regionFromCoordinates(coordinates, delta);
}

function toLatLng(coords: { latitude: number; longitude: number }): LatLng {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude
  };
}

function formatPrice(price: number) {
  return price === 0 ? "Gratis" : `EUR ${price}`;
}

function formatSeats(event: EvntEvent) {
  return event.capacity ? `${event.participants}/${event.capacity} posti` : "Posti illimitati";
}

function distanceBetweenKm(from: LatLng, to: LatLng) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const halfChord =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));
}

export function MapScreen({
  events,
  favorites,
  registrations,
  onOpenEvent,
  onToggleFavorite
}: MapScreenProps) {
  const mapRef = useRef<MapView | null>(null);
  const [category, setCategory] = useState<Category | "Tutti">("Tutti");
  const [radiusKm, setRadiusKm] = useState<RadiusOption>(10);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id);
  const [userCoordinates, setUserCoordinates] = useState<LatLng | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("loading");
  const [mapReady, setMapReady] = useState(false);

  const eventDistances = useMemo(() => {
    return events.reduce<Record<string, number>>((distances, event) => {
      distances[event.id] = userCoordinates
        ? distanceBetweenKm(userCoordinates, event.coordinates)
        : event.distanceKm;
      return distances;
    }, {});
  }, [events, userCoordinates]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesCategory = category === "Tutti" || event.category === category;
        const distanceKm = eventDistances[event.id] ?? event.distanceKm;
        return matchesCategory && distanceKm <= radiusKm;
      }),
    [category, eventDistances, events, radiusKm]
  );

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0];

  const updateUserLocation = useCallback(async (animate = true) => {
    setLocationStatus("loading");

    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationStatus("unavailable");
        return;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setLocationStatus("denied");
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        const coords = toLatLng(lastKnown.coords);
        setUserCoordinates(coords);
        setLocationStatus("granted");
        if (animate) {
          mapRef.current?.animateToRegion(regionFromCoordinates(coords), 500);
        }
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coords = toLatLng(current.coords);
      setUserCoordinates(coords);
      setLocationStatus("granted");
      if (animate) {
        mapRef.current?.animateToRegion(regionFromCoordinates(coords), 500);
      }
    } catch {
      setLocationStatus("unavailable");
    }
  }, []);

  useEffect(() => {
    void updateUserLocation(false);
  }, [updateUserLocation]);

  useEffect(() => {
    if (!mapReady || filteredEvents.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(
      [
        ...filteredEvents.map((event) => event.coordinates),
        ...(userCoordinates ? [userCoordinates] : [])
      ],
      { animated: true, edgePadding: mapEdgePadding }
    );
  }, [filteredEvents, mapReady, userCoordinates]);

  useEffect(() => {
    if (selectedEventId && filteredEvents.some((event) => event.id === selectedEventId)) {
      return;
    }

    setSelectedEventId(filteredEvents[0]?.id);
  }, [filteredEvents, selectedEventId]);

  const selectEvent = (event: EvntEvent) => {
    setSelectedEventId(event.id);
    mapRef.current?.animateToRegion(regionFromCoordinates(event.coordinates, 0.018), 450);
  };

  const locationCopy = {
    denied: {
      body: "Abilita il permesso posizione per vedere dove sei sulla mappa.",
      icon: "location-outline" as const,
      title: "Posizione non autorizzata"
    },
    granted: {
      body: userCoordinates ? "La tua posizione e gli eventi sono sulla mappa reale." : "Posizione attiva.",
      icon: "navigate" as const,
      title: "Geolocalizzazione attiva"
    },
    loading: {
      body: "Sto recuperando la posizione dal dispositivo.",
      icon: "locate-outline" as const,
      title: "Cerco la tua posizione"
    },
    unavailable: {
      body: "Servizi posizione non disponibili su questo dispositivo.",
      icon: "alert-circle-outline" as const,
      title: "Posizione non disponibile"
    }
  }[locationStatus];

  const radiusCenter = useMemo(
    () =>
      userCoordinates ?? {
        latitude: defaultRegion.latitude,
        longitude: defaultRegion.longitude
      },
    [userCoordinates]
  );

  useEffect(() => {
    if (!mapReady || filteredEvents.length > 0) {
      return;
    }

    mapRef.current?.animateToRegion(regionFromRadius(radiusCenter, radiusKm), 400);
  }, [filteredEvents.length, mapReady, radiusCenter, radiusKm]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Mappa eventi</Text>
        <Text style={styles.subtitle}>
          {filteredEvents.length} eventi entro {radiusKm} km
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroller}>
        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setCategory("Tutti")}
            style={[styles.allChip, category === "Tutti" && styles.allChipActive]}
          >
            <Text style={[styles.allChipText, category === "Tutti" && styles.allChipTextActive]}>
              Tutti
            </Text>
          </Pressable>
          {categories.map((item) => (
            <CategoryChip
              category={item}
              key={item}
              onPress={() => setCategory(item)}
              selected={category === item}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.radiusSection}>
        <View style={styles.radiusHeader}>
          <Text style={styles.radiusTitle}>Raggio d'azione</Text>
          <Text style={styles.radiusValue}>{radiusKm} km</Text>
        </View>
        <View style={styles.radiusOptions}>
          {radiusOptions.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: radiusKm === option }}
              key={option}
              onPress={() => setRadiusKm(option)}
              style={[styles.radiusChip, radiusKm === option && styles.radiusChipActive]}
            >
              <Text style={[styles.radiusChipText, radiusKm === option && styles.radiusChipTextActive]}>
                {option} km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.mapFrame}>
        <MapView
          initialRegion={defaultRegion}
          onMapReady={() => setMapReady(true)}
          ref={mapRef}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={locationStatus === "granted"}
          style={styles.map}
          userInterfaceStyle="light"
        >
          <Circle
            center={radiusCenter}
            fillColor="rgba(37, 99, 235, 0.10)"
            radius={radiusKm * 1000}
            strokeColor="rgba(37, 99, 235, 0.35)"
            strokeWidth={2}
          />
          {filteredEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id;
            return (
              <Marker
                coordinate={event.coordinates}
                identifier={event.id}
                key={event.id}
                onPress={() => selectEvent(event)}
                zIndex={isSelected ? 2 : 1}
              >
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor: categoryColors[event.category],
                      borderColor: categorySoftColors[event.category]
                    },
                    isSelected && styles.markerSelected
                  ]}
                >
                  <Ionicons color={colors.surface} name="location" size={18} />
                </View>
              </Marker>
            );
          })}
        </MapView>

        <Pressable
          accessibilityLabel="Centra sulla mia posizione"
          accessibilityRole="button"
          onPress={() => updateUserLocation(true)}
          style={styles.locateButton}
        >
          <Ionicons color={colors.ink} name="navigate-outline" size={21} />
        </Pressable>

        {selectedEvent && (
          <PoiPreviewCard
            distanceKm={eventDistances[selectedEvent.id] ?? selectedEvent.distanceKm}
            event={selectedEvent}
            favorite={favorites.has(selectedEvent.id)}
            onOpen={() => onOpenEvent(selectedEvent)}
            onToggleFavorite={() => onToggleFavorite(selectedEvent.id)}
            registered={registrations.has(selectedEvent.id)}
          />
        )}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyIcon}>
              <Ionicons color={colors.ink} name="map-outline" size={22} />
            </View>
            <Text style={styles.emptyTitle}>Non ce ne sono entro questo raggio</Text>
            <Text style={styles.emptyText}>
              Prova ad aumentare il raggio d'azione o a cambiare categoria.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.locationPanel}>
        <View style={styles.locationIcon}>
          <Ionicons color={colors.ink} name={locationCopy.icon} size={20} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>{locationCopy.title}</Text>
          <Text style={styles.locationText}>{locationCopy.body}</Text>
        </View>
      </View>

    </ScrollView>
  );
}

type PoiPreviewCardProps = {
  distanceKm: number;
  event: EvntEvent;
  favorite: boolean;
  registered: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
};

function PoiPreviewCard({
  distanceKm,
  event,
  favorite,
  registered,
  onOpen,
  onToggleFavorite
}: PoiPreviewCardProps) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];

  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={styles.poiCard}>
      <View style={styles.poiTopRow}>
        <View style={[styles.poiBadge, { backgroundColor: soft, borderColor: accent }]}>
          <Text style={styles.poiBadgeEmoji}>{emoji}</Text>
          <Text style={[styles.poiBadgeText, { color: accent }]}>{event.category}</Text>
        </View>

        <Pressable
          accessibilityLabel={favorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
          accessibilityRole="button"
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            color={favorite ? colors.teal : colors.ink}
            name={favorite ? "heart" : "heart-outline"}
            size={19}
          />
        </Pressable>
      </View>

      <Text numberOfLines={1} style={styles.poiTitle}>
        {event.title}
      </Text>

      <View style={styles.poiMetaGrid}>
        <View style={styles.poiMetaItem}>
          <Ionicons color={colors.muted} name="calendar-outline" size={15} />
          <Text numberOfLines={1} style={styles.poiMetaText}>
            {event.date} · {event.time}
          </Text>
        </View>
        <View style={styles.poiMetaItem}>
          <Ionicons color={colors.muted} name="location-outline" size={15} />
          <Text numberOfLines={1} style={styles.poiMetaText}>
            {event.place} · {distanceKm.toFixed(1)} km
          </Text>
        </View>
      </View>

      <View style={styles.poiFooter}>
        <View style={styles.poiStats}>
          <Text style={styles.poiStatText}>{formatPrice(event.price)}</Text>
          <Text style={styles.poiDot}>·</Text>
          <Text style={styles.poiStatText}>{formatSeats(event)}</Text>
          {registered && (
            <>
              <Text style={styles.poiDot}>·</Text>
              <Text style={styles.registeredText}>Iscritto</Text>
            </>
          )}
        </View>

        <View style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Dettagli</Text>
          <Ionicons color={colors.surface} name="arrow-forward" size={15} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  filterScroller: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.xl
  },
  allChip: {
    backgroundColor: "#F7F3EA",
    borderColor: "#F7F3EA",
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    ...shadow
  },
  allChipActive: {
    backgroundColor: "#F0EEFF",
    borderColor: "#5A4BC4"
  },
  allChipText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  allChipTextActive: {
    color: "#5A4BC4"
  },
  radiusSection: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  radiusHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  radiusTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  radiusValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  radiusOptions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  radiusChip: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderColor: "#EEF5FF",
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44
  },
  radiusChipActive: {
    backgroundColor: "#F0EEFF",
    borderColor: "#5A4BC4"
  },
  radiusChipText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  radiusChipTextActive: {
    color: "#5A4BC4"
  },
  mapFrame: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 460,
    overflow: "hidden",
    position: "relative",
    ...shadow
  },
  map: {
    ...StyleSheet.absoluteFillObject
  },
  marker: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 4,
    height: 36,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 36
  },
  markerSelected: {
    transform: [{ scale: 1.14 }]
  },
  locateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    width: 42,
    ...shadow
  },
  poiCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: spacing.md,
    gap: spacing.sm,
    left: spacing.md,
    padding: spacing.md,
    position: "absolute",
    right: spacing.md,
    ...shadow
  },
  poiTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  poiBadge: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 5
  },
  poiBadgeEmoji: {
    fontSize: 13
  },
  poiBadgeText: {
    fontSize: 12,
    fontWeight: "900"
  },
  favoriteButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  poiTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22
  },
  poiMetaGrid: {
    gap: spacing.xs
  },
  poiMetaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  poiMetaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "700"
  },
  poiFooter: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    paddingTop: spacing.sm
  },
  poiStats: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  poiStatText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  poiDot: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  registeredText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900"
  },
  detailButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md
  },
  detailButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  emptyOverlay: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    top: 118,
    ...shadow
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center"
  },
  locationPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  locationIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  locationCopy: {
    flex: 1,
    gap: 2
  },
  locationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  locationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  }
});

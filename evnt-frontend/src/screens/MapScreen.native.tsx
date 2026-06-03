import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import MapView, { Callout, Circle, Marker, type LatLng, type Region } from "react-native-maps";

import { LocationFallbackBanner } from "../components/LocationFallbackBanner";
import { MapFiltersModal, MapFiltersSheet, type PriceFilter } from "../components/MapFiltersModal";
import { PillButton } from "../components/PillButton";
import { cityMatches, findCitySuggestion } from "../data/cities";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, Coordinates, EvntEvent, LocationStatus, UserProfile } from "../types";

type MapScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  locationStatus: LocationStatus;
  registrations: Set<string>;
  user: UserProfile;
  userCoordinates: Coordinates | null;
  onOpenEvent: (event: EvntEvent) => void;
  onRequestLocation: () => Promise<Coordinates | null>;
  onToggleFavorite: (eventId: string) => void;
};

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
  locationStatus,
  registrations,
  user,
  userCoordinates,
  onOpenEvent,
  onRequestLocation,
  onToggleFavorite
}: MapScreenProps) {
  const mapRef = useRef<MapView | null>(null);
  const fullscreenMapRef = useRef<MapView | null>(null);
  const [category, setCategory] = useState<Category | "Tutti">("Tutti");
  const [price, setPrice] = useState<PriceFilter>("tutti");
  const [radiusKm, setRadiusKm] = useState<RadiusOption>(10);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id);
  const [mapReady, setMapReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const fallbackCoordinates = useMemo(() => {
    const fallbackCity = findCitySuggestion(user.city);
    return toLatLng(
      user.cityCoordinates ?? fallbackCity?.coordinates ?? {
        latitude: defaultRegion.latitude,
        longitude: defaultRegion.longitude
      }
    );
  }, [user.city, user.cityCoordinates]);

  const hasDeviceLocation = locationStatus === "granted" && userCoordinates !== null;
  const usesCityFallback = !hasDeviceLocation;
  const showLocationFallbackNotice = usesCityFallback && locationStatus !== "loading";
  const radiusCenter = useMemo(
    () => (hasDeviceLocation && userCoordinates ? toLatLng(userCoordinates) : fallbackCoordinates),
    [fallbackCoordinates, hasDeviceLocation, userCoordinates]
  );

  const eventDistances = useMemo(() => {
    return events.reduce<Record<string, number>>((distances, event) => {
      distances[event.id] = distanceBetweenKm(radiusCenter, event.coordinates);
      return distances;
    }, {});
  }, [events, radiusCenter]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesFallbackCity = !usesCityFallback || cityMatches(event.city, user.city);
        const matchesCategory = category === "Tutti" || event.category === category;
        const matchesPrice =
          price === "tutti" ||
          (price === "gratis" && event.price === 0) ||
          (price === "pagamento" && event.price > 0);
        const distanceKm = eventDistances[event.id] ?? event.distanceKm;
        return matchesFallbackCity && matchesCategory && matchesPrice && distanceKm <= radiusKm;
      }),
    [category, eventDistances, events, price, radiusKm, user.city, usesCityFallback]
  );

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0];

  const updateUserLocation = useCallback(async () => {
    const coords = await onRequestLocation();
    if (coords) {
      const region = regionFromCoordinates(toLatLng(coords));
      mapRef.current?.animateToRegion(region, 500);
      fullscreenMapRef.current?.animateToRegion(region, 500);
    }
  }, [onRequestLocation]);

  useEffect(() => {
    if (!mapReady || filteredEvents.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(
      [
        ...filteredEvents.map((event) => event.coordinates),
        radiusCenter
      ],
      { animated: true, edgePadding: mapEdgePadding }
    );
  }, [filteredEvents, mapReady, radiusCenter]);

  useEffect(() => {
    if (selectedEventId && filteredEvents.some((event) => event.id === selectedEventId)) {
      return;
    }

    setSelectedEventId(filteredEvents[0]?.id);
  }, [filteredEvents, selectedEventId]);

  const selectEvent = (event: EvntEvent) => {
    const region = regionFromCoordinates(event.coordinates, 0.018);
    setSelectedEventId(event.id);
    mapRef.current?.animateToRegion(region, 450);
    fullscreenMapRef.current?.animateToRegion(region, 450);
  };

  const locationCopy = {
    denied: {
      body: `Permesso posizione mancante: mostriamo gli eventi della citta indicata, ${user.city}.`,
      icon: "location-outline" as const,
      title: "Posizione non autorizzata"
    },
    granted: {
      body: userCoordinates ? "La tua posizione e gli eventi sono sulla mappa reale." : "Posizione attiva.",
      icon: "navigate" as const,
      title: "Geolocalizzazione attiva"
    },
    loading: {
      body: `Sto recuperando la posizione. Intanto uso ${user.city}.`,
      icon: "locate-outline" as const,
      title: "Cerco la tua posizione"
    },
    unavailable: {
      body: `Servizi posizione non disponibili: mostriamo gli eventi della citta indicata, ${user.city}.`,
      icon: "alert-circle-outline" as const,
      title: "Posizione non disponibile"
    }
  }[locationStatus];

  useEffect(() => {
    if (!mapReady || filteredEvents.length > 0) {
      return;
    }

    mapRef.current?.animateToRegion(regionFromRadius(radiusCenter, radiusKm), 400);
  }, [filteredEvents.length, mapReady, radiusCenter, radiusKm]);

  const activeFilterCount =
    (category === "Tutti" ? 0 : 1) + (price === "tutti" ? 0 : 1) + (radiusKm === 10 ? 0 : 1);

  const clearFilters = () => {
    setCategory("Tutti");
    setPrice("tutti");
    setRadiusKm(10);
  };

  const closeFullscreen = () => {
    setFullscreenOpen(false);
    setFiltersOpen(false);
  };

  return (
    <>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Mappa eventi</Text>
            <Text style={styles.subtitle}>
              {filteredEvents.length} eventi entro {radiusKm} km
              {usesCityFallback ? ` a ${user.city}` : ""}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Filtri mappa"
            accessibilityRole="button"
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
          >
            <Ionicons color={colors.ink} name="options-outline" size={20} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {showLocationFallbackNotice && (
          <LocationFallbackBanner city={user.city} onRetry={() => void updateUserLocation()} />
        )}

        <View style={styles.mapFrame}>
        <MapView
          initialRegion={defaultRegion}
          onMapReady={() => setMapReady(true)}
          ref={mapRef}
          showsCompass={false}
          showsMyLocationButton={false}
          showsUserLocation={hasDeviceLocation}
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
                      backgroundColor: categorySoftColors[event.category],
                      borderColor: categoryColors[event.category]
                    },
                    isSelected && styles.markerSelected
                  ]}
                >
                  <Text style={styles.markerEmoji}>{categoryEmojis[event.category]}</Text>
                </View>
                {isSelected && (
                  <Callout onPress={() => onOpenEvent(event)} tooltip>
                    <PoiPreviewCard
                      distanceKm={eventDistances[event.id] ?? event.distanceKm}
                      event={event}
                      favorite={favorites.has(event.id)}
                      onOpen={() => onOpenEvent(event)}
                      onToggleFavorite={() => onToggleFavorite(event.id)}
                      registered={registrations.has(event.id)}
                    />
                  </Callout>
                )}
              </Marker>
            );
          })}
        </MapView>

        <Pressable
          accessibilityLabel="Centra sulla mia posizione"
          accessibilityRole="button"
          onPress={() => void updateUserLocation()}
          style={styles.locateButton}
        >
          <Ionicons color={colors.ink} name="locate-outline" size={21} />
        </Pressable>

        <Pressable
          accessibilityLabel="Apri mappa a schermo intero"
          accessibilityRole="button"
          onPress={() => setFullscreenOpen(true)}
          style={[styles.expandButton, selectedEvent && styles.expandButtonRaised]}
        >
          <Ionicons color={colors.ink} name="expand-outline" size={21} />
        </Pressable>

      </View>

      {filteredEvents.length === 0 && (
        <View style={styles.emptyPanel}>
          <View style={styles.emptyIcon}>
            <Ionicons color={colors.ink} name="map-outline" size={22} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Non ci sono eventi entro questo raggio</Text>
            <Text style={styles.emptyText}>
              Prova ad aumentare il raggio d'azione o a cambiare categoria.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.locationPanel}>
        <View style={styles.locationIcon}>
          <Ionicons color={colors.ink} name={locationCopy.icon} size={20} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>{locationCopy.title}</Text>
          <Text style={styles.locationText}>{locationCopy.body}</Text>
        </View>
      </View>

      </View>

      <Modal animationType="fade" onRequestClose={closeFullscreen} visible={fullscreenOpen}>
        <View style={styles.fullscreenRoot}>
          <MapView
            initialRegion={regionFromRadius(radiusCenter, radiusKm)}
            ref={fullscreenMapRef}
            showsCompass={false}
            showsMyLocationButton={false}
            showsUserLocation={hasDeviceLocation}
            style={styles.fullscreenMap}
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
                  identifier={`fullscreen-${event.id}`}
                  key={event.id}
                  onPress={() => selectEvent(event)}
                  zIndex={isSelected ? 2 : 1}
                >
                  <View
                    style={[
                      styles.marker,
                      {
                        backgroundColor: categorySoftColors[event.category],
                        borderColor: categoryColors[event.category]
                      },
                      isSelected && styles.markerSelected
                    ]}
                  >
                    <Text style={styles.markerEmoji}>{categoryEmojis[event.category]}</Text>
                  </View>
                  {isSelected && (
                    <Callout onPress={() => onOpenEvent(event)} tooltip>
                      <PoiPreviewCard
                        distanceKm={eventDistances[event.id] ?? event.distanceKm}
                        event={event}
                        favorite={favorites.has(event.id)}
                        onOpen={() => onOpenEvent(event)}
                        onToggleFavorite={() => onToggleFavorite(event.id)}
                        registered={registrations.has(event.id)}
                      />
                    </Callout>
                  )}
                </Marker>
              );
            })}
          </MapView>
          <Pressable
            accessibilityLabel="Filtri mappa"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setFiltersOpen(true)}
            style={styles.fullscreenFilterButton}
          >
            <Ionicons color={colors.ink} name="options-outline" size={22} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            accessibilityLabel="Centra sulla mia posizione"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void updateUserLocation()}
            style={styles.fullscreenLocateButton}
          >
            <Ionicons color={colors.ink} name="locate-outline" size={22} />
          </Pressable>
          <Pressable
            accessibilityLabel="Chiudi mappa a schermo intero"
            accessibilityRole="button"
            hitSlop={8}
            onPress={closeFullscreen}
            style={styles.fullscreenClose}
          >
            <Ionicons color={colors.ink} name="contract-outline" size={22} />
          </Pressable>
          {filtersOpen && (
            <View style={styles.fullscreenFilterOverlay}>
              <MapFiltersSheet
                category={category}
                onCategoryChange={setCategory}
                onClose={() => setFiltersOpen(false)}
                onPriceChange={setPrice}
                onRadiusChange={(value) => setRadiusKm(value as RadiusOption)}
                onReset={clearFilters}
                price={price}
                radiusKm={radiusKm}
                radiusOptions={radiusOptions}
              />
            </View>
          )}
        </View>
      </Modal>

      <MapFiltersModal
        category={category}
        onCategoryChange={setCategory}
        onClose={() => setFiltersOpen(false)}
        onPriceChange={setPrice}
        onRadiusChange={(value) => setRadiusKm(value as RadiusOption)}
        onReset={clearFilters}
        price={price}
        radiusKm={radiusKm}
        radiusOptions={radiusOptions}
        visible={!fullscreenOpen && filtersOpen}
      />
    </>
  );
}

type PoiPreviewCardProps = {
  distanceKm: number;
  event: EvntEvent;
  favorite: boolean;
  registered: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  style?: StyleProp<ViewStyle>;
};

function PoiPreviewCard({
  distanceKm,
  event,
  favorite,
  registered,
  onOpen,
  onToggleFavorite,
  style
}: PoiPreviewCardProps) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];
  const categoryLabel = getEventSubcategoryLabel(event);

  return (
    <View style={[styles.poiCard, style]}>
      <View style={styles.poiTopRow}>
        <PillButton accent={accent} emoji={emoji} label={categoryLabel} soft={soft} />

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

        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.detailButton}>
          <Text style={styles.detailButtonText}>Dettagli</Text>
          <Ionicons color={colors.surface} name="arrow-forward" size={15} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.lg
  },
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
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
  filterBadge: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 9,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    top: 7,
    width: 18
  },
  filterBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "900"
  },
  filterButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    position: "relative",
    width: 52
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
    flex: 1,
    minHeight: 500,
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
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    width: 36
  },
  markerEmoji: {
    fontSize: 18,
    lineHeight: 22
  },
  markerSelected: {
    transform: [{ scale: 1.14 }]
  },
  expandButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    bottom: spacing.md,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    right: spacing.md,
    width: 42,
    ...shadow
  },
  expandButtonRaised: {
    bottom: spacing.md
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
    gap: spacing.xs,
    padding: spacing.sm,
    width: 236,
    ...shadow
  },
  poiTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  favoriteButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  poiTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18
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
    fontSize: 11,
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
    fontSize: 11,
    fontWeight: "900"
  },
  poiDot: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  registeredText: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "900"
  },
  detailButton: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm
  },
  detailButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  emptyCopy: {
    flex: 1,
    gap: 2
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
  emptyPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
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
  },
  fullscreenClose: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: 64,
    width: 44,
    zIndex: 12,
    ...shadow
  },
  fullscreenFilterButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    left: spacing.lg,
    position: "absolute",
    top: 64,
    width: 44,
    zIndex: 12,
    ...shadow
  },
  fullscreenFilterOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20
  },
  fullscreenLocateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: 118,
    width: 44,
    zIndex: 12,
    ...shadow
  },
  fullscreenMap: {
    ...StyleSheet.absoluteFillObject
  },
  fullscreenRoot: {
    backgroundColor: colors.background,
    flex: 1
  }
});

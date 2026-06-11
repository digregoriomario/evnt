import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import MapView, { Callout, Circle, Marker, type LatLng, type Region } from "react-native-maps";

import { LocationFallbackBanner } from "../components/LocationFallbackBanner";
import { MapFiltersModal, MapFiltersSheet } from "../components/MapFiltersModal";
import { PillButton } from "../components/PillButton";
import { buildEventFilterResult, defaultMapCoordinates, eventRadiusOptions } from "../application/events/eventFiltering";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Coordinates, EventFilterState, EvntEvent, LocationStatus, UserProfile } from "../types";

type MapScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  filters: EventFilterState;
  locationStatus: LocationStatus;
  registrations: Set<string>;
  user: UserProfile;
  userCoordinates: Coordinates | null;
  onFiltersChange: (updates: Partial<EventFilterState>) => void;
  onOpenEvent: (event: EvntEvent) => void;
  onRequestLocation: () => Promise<Coordinates | null>;
  onResetFilters: () => void;
  onToggleFavorite: (eventId: string) => void;
};

const defaultRegion: Region = {
  latitude: defaultMapCoordinates.latitude,
  latitudeDelta: 0.06,
  longitude: defaultMapCoordinates.longitude,
  longitudeDelta: 0.06
};

const mapEdgePadding = {
  bottom: 190,
  left: 44,
  right: 44,
  top: 72
};

function regionFromCoordinates(coordinates: LatLng, delta = 0.035): Region {
  return {
    latitude: coordinates.latitude,
    latitudeDelta: delta,
    longitude: coordinates.longitude,
    longitudeDelta: delta
  };
}

function regionFromRadius(coordinates: LatLng, radiusKm: number): Region {
  if (radiusKm <= 0) {
    return regionFromCoordinates(coordinates, 4.5);
  }
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

function radiusEventLabel(radiusKm: number) {
  return radiusKm === 0 ? "tutti gli eventi" : `eventi entro ${radiusKm} km`;
}

export function MapScreen({
  events,
  favorites,
  filters,
  locationStatus,
  registrations,
  user,
  userCoordinates,
  onFiltersChange,
  onOpenEvent,
  onRequestLocation,
  onResetFilters,
  onToggleFavorite
}: MapScreenProps) {
  const mapRef = useRef<MapView | null>(null);
  const fullscreenMapRef = useRef<MapView | null>(null);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id);
  const [mapReady, setMapReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const {
    activeFilterCount,
    eventDistances,
    filteredEvents,
    hasDeviceLocation,
    radiusFilterEnabled,
    radiusCenter,
    showLocationFallbackNotice,
    usesCityFallback
  } = useMemo(
    () =>
      buildEventFilterResult({
        events,
        filters,
        locationStatus,
        user,
        userCoordinates
      }),
    [events, filters, locationStatus, user, userCoordinates]
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

    mapRef.current?.animateToRegion(regionFromRadius(radiusCenter, radiusFilterEnabled ? filters.radiusKm : 0), 400);
  }, [filteredEvents.length, filters.radiusKm, mapReady, radiusCenter, radiusFilterEnabled]);

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
              {usesCityFallback
                ? `${filteredEvents.length} eventi a ${user.city}`
                : `${filteredEvents.length} ${radiusEventLabel(filters.radiusKm)}`}
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
          {radiusFilterEnabled && filters.radiusKm > 0 ? (
            <Circle
              center={radiusCenter}
              fillColor="rgba(37, 99, 235, 0.10)"
              radius={filters.radiusKm * 1000}
              strokeColor="rgba(37, 99, 235, 0.35)"
              strokeWidth={2}
            />
          ) : null}
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
            <Text style={styles.emptyTitle}>
              {usesCityFallback ? `Non ci sono eventi a ${user.city}` : "Non ci sono eventi entro questo raggio"}
            </Text>
            <Text style={styles.emptyText}>
              {usesCityFallback
                ? "Cambia categoria o aggiorna la citta nel profilo."
                : "Prova ad aumentare il raggio d'azione o a cambiare categoria."}
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
            initialRegion={regionFromRadius(radiusCenter, radiusFilterEnabled ? filters.radiusKm : 0)}
            ref={fullscreenMapRef}
            showsCompass={false}
            showsMyLocationButton={false}
            showsUserLocation={hasDeviceLocation}
            style={styles.fullscreenMap}
            userInterfaceStyle="light"
          >
            {radiusFilterEnabled && filters.radiusKm > 0 ? (
              <Circle
                center={radiusCenter}
                fillColor="rgba(37, 99, 235, 0.10)"
                radius={filters.radiusKm * 1000}
                strokeColor="rgba(37, 99, 235, 0.35)"
                strokeWidth={2}
              />
            ) : null}
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
                category={filters.category}
                onCategoryChange={(category) => onFiltersChange({ category })}
                onClose={() => setFiltersOpen(false)}
                onPriceChange={(price) => onFiltersChange({ price })}
                onQueryChange={(query) => onFiltersChange({ query })}
                onRadiusChange={(radiusKm) => onFiltersChange({ radiusKm })}
                onReset={onResetFilters}
                price={filters.price}
                query={filters.query}
                radiusDisabled={!radiusFilterEnabled}
                radiusKm={filters.radiusKm}
                radiusOptions={[...eventRadiusOptions]}
              />
            </View>
          )}
        </View>
      </Modal>

      <MapFiltersModal
        category={filters.category}
        onCategoryChange={(category) => onFiltersChange({ category })}
        onClose={() => setFiltersOpen(false)}
        onPriceChange={(price) => onFiltersChange({ price })}
        onQueryChange={(query) => onFiltersChange({ query })}
        onRadiusChange={(radiusKm) => onFiltersChange({ radiusKm })}
        onReset={onResetFilters}
        price={filters.price}
        query={filters.query}
        radiusDisabled={!radiusFilterEnabled}
        radiusKm={filters.radiusKm}
        radiusOptions={[...eventRadiusOptions]}
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

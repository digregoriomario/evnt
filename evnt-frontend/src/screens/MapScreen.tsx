import { Ionicons } from "@expo/vector-icons";
import L, {
  type Circle as LeafletCircle,
  type LatLngExpression,
  type Map as LeafletMap,
  type Marker as LeafletMarker
} from "leaflet";
import { createElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { LocationFallbackBanner } from "../components/LocationFallbackBanner";
import { MapFiltersModal, MapFiltersSheet } from "../components/MapFiltersModal";
import { PillButton } from "../components/PillButton";
import { buildEventFilterResult, eventRadiusOptions } from "../application/events/eventFiltering";
import { categoryColors, categoryEmojis, categorySoftColors, getEventSubcategoryLabel } from "../data/events";
import { ensureLeafletStyles } from "../styles/leafletWeb";
import { colors, radius, shadow, spacing } from "../theme";
import { EventFilterState, Coordinates, EvntEvent, LocationStatus, UserProfile } from "../types";

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

type Point = {
  x: number;
  y: number;
};

type WebLeafletMapProps = {
  activeFilterCount: number;
  eventDistances: Record<string, number>;
  events: EvntEvent[];
  favorites: Set<string>;
  fullscreen?: boolean;
  hasDeviceLocation: boolean;
  onClose?: () => void;
  onExpand?: () => void;
  onFilter?: () => void;
  onLocate?: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onSelectEvent: (event: EvntEvent) => void;
  onToggleFavorite: (eventId: string) => void;
  radiusCenter: Coordinates;
  radiusKm: number;
  registrations: Set<string>;
  selectedEvent?: EvntEvent;
};

type PoiPreviewCardProps = {
  distanceKm: number;
  event: EvntEvent;
  favorite: boolean;
  registered: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
  style?: StyleProp<ViewStyle>;
};

const leafletContainerStyle: CSSProperties = {
  bottom: 0,
  left: 0,
  position: "absolute",
  right: 0,
  top: 0,
  width: "100%"
};

function toLatLng(coords: Coordinates): LatLngExpression {
  return [coords.latitude, coords.longitude];
}

function formatPrice(price: number) {
  return price === 0 ? "Gratis" : `EUR ${price}`;
}

function formatSeats(event: EvntEvent) {
  return event.capacity ? `${event.participants}/${event.capacity} partecipanti` : `${event.participants} partecipanti`;
}

function radiusEventLabel(radiusKm: number) {
  return radiusKm === 0 ? "tutti gli eventi" : `eventi entro ${radiusKm} km`;
}

function zoomFromRadius(radiusKm: number) {
  if (radiusKm <= 0) return 6;
  if (radiusKm <= 1) return 15;
  if (radiusKm <= 3) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  return 11;
}

function createEventIcon(event: EvntEvent, selected: boolean) {
  const size = selected ? 42 : 36;
  const accent = categoryColors[event.category];
  const soft = categorySoftColors[event.category];
  const emoji = categoryEmojis[event.category];

  return L.divIcon({
    className: "evnt-leaflet-marker",
    html: `<div style="
      align-items:center;
      background:${soft};
      border:2px solid ${accent};
      border-radius:999px;
      box-shadow:0 8px 18px rgba(17,24,39,0.20);
      display:flex;
      height:${size}px;
      justify-content:center;
      line-height:${size}px;
      width:${size}px;
    "><span style="font-size:18px;line-height:1">${emoji}</span></div>`,
    iconAnchor: [size / 2, size / 2],
    iconSize: [size, size]
  });
}

function createUserIcon() {
  return L.divIcon({
    className: "evnt-leaflet-user-marker",
    html: `<div style="
      align-items:center;
      background:${colors.ink};
      border:3px solid ${colors.surface};
      border-radius:999px;
      box-shadow:0 8px 18px rgba(17,24,39,0.20);
      color:${colors.surface};
      display:flex;
      font-size:15px;
      height:36px;
      justify-content:center;
      line-height:1;
      width:36px;
    ">➤</div>`,
    iconAnchor: [18, 18],
    iconSize: [36, 36]
  });
}

function cardPosition(point: Point, frameWidth: number, frameHeight: number): ViewStyle {
  const cardWidth = 236;
  const estimatedCardHeight = 158;
  const horizontalGap = 12;
  const verticalGap = 12;
  const wantsLeft = point.x > frameWidth - cardWidth - 28;
  const wantsAbove = point.y > frameHeight - estimatedCardHeight - 28;
  const rawLeft = wantsLeft ? point.x - cardWidth - horizontalGap : point.x + horizontalGap;
  const rawTop = wantsAbove ? point.y - estimatedCardHeight - verticalGap : point.y + verticalGap;

  return {
    left: Math.max(8, Math.min(frameWidth - cardWidth - 8, rawLeft)),
    top: Math.max(8, Math.min(frameHeight - estimatedCardHeight - 8, rawTop))
  };
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
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id);
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
  const mapIsEmpty = filteredEvents.length === 0;
  const canCenterOnUser = locationStatus === "granted" && userCoordinates !== null && hasDeviceLocation;

  useEffect(() => {
    if (selectedEventId && filteredEvents.some((event) => event.id === selectedEventId)) {
      return;
    }

    setSelectedEventId(filteredEvents[0]?.id);
  }, [filteredEvents, selectedEventId]);

  const selectEvent = useCallback((event: EvntEvent) => {
    setSelectedEventId(event.id);
  }, []);

  const updateUserLocation = useCallback(async () => {
    await onRequestLocation();
  }, [onRequestLocation]);

  useEffect(() => {
    void onRequestLocation();
  }, [onRequestLocation]);

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

        <WebLeafletMap
          activeFilterCount={activeFilterCount}
          eventDistances={eventDistances}
          events={filteredEvents}
          favorites={favorites}
          hasDeviceLocation={canCenterOnUser}
          onExpand={() => setFullscreenOpen(true)}
          onFilter={() => setFiltersOpen(true)}
          onLocate={() => void updateUserLocation()}
          onOpenEvent={onOpenEvent}
          onSelectEvent={selectEvent}
          onToggleFavorite={onToggleFavorite}
          radiusCenter={radiusCenter}
          radiusKm={radiusFilterEnabled ? filters.radiusKm : 0}
          registrations={registrations}
          selectedEvent={selectedEvent}
        />

        {mapIsEmpty && (
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

      </View>

      <Modal animationType="fade" onRequestClose={closeFullscreen} visible={fullscreenOpen}>
        <View style={styles.fullscreenRoot}>
          <WebLeafletMap
            activeFilterCount={activeFilterCount}
            eventDistances={eventDistances}
            events={filteredEvents}
            favorites={favorites}
            fullscreen
            hasDeviceLocation={canCenterOnUser}
            onClose={closeFullscreen}
            onFilter={() => setFiltersOpen(true)}
            onLocate={() => void updateUserLocation()}
            onOpenEvent={onOpenEvent}
            onSelectEvent={selectEvent}
            onToggleFavorite={onToggleFavorite}
            radiusCenter={radiusCenter}
            radiusKm={radiusFilterEnabled ? filters.radiusKm : 0}
            registrations={registrations}
            selectedEvent={selectedEvent}
          />
          {filtersOpen && (
            <View style={styles.fullscreenFilterOverlay}>
              <MapFiltersSheet
                selectedCategories={filters.categories ?? []}
                onCategoriesChange={(categories) => onFiltersChange({ categories })}
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
        selectedCategories={filters.categories ?? []}
        onCategoriesChange={(categories) => onFiltersChange({ categories })}
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

function WebLeafletMap({
  activeFilterCount,
  eventDistances,
  events,
  favorites,
  fullscreen = false,
  hasDeviceLocation,
  onClose,
  onExpand,
  onFilter,
  onLocate,
  onOpenEvent,
  onSelectEvent,
  onToggleFavorite,
  radiusCenter,
  radiusKm,
  registrations,
  selectedEvent
}: WebLeafletMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const radiusCircleRef = useRef<LeafletCircle | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const selectedEventRef = useRef<EvntEvent | undefined>(selectedEvent);
  const [mapReady, setMapReady] = useState(false);
  const [mapSize, setMapSize] = useState({ height: fullscreen ? 900 : 620, width: 480 });
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);

  const updateSelectedPoint = useCallback(() => {
    const map = mapRef.current;
    const event = selectedEventRef.current;
    if (!map || !event) {
      setSelectedPoint(null);
      return;
    }

    const point = map.latLngToContainerPoint(toLatLng(event.coordinates));
    setSelectedPoint({ x: point.x, y: point.y });
  }, []);

  useEffect(() => {
    selectedEventRef.current = selectedEvent;
    updateSelectedPoint();
  }, [selectedEvent, updateSelectedPoint]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    ensureLeafletStyles();
    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      scrollWheelZoom: true,
      zoomControl: false
    }).setView(toLatLng(radiusCenter), zoomFromRadius(radiusKm));

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19
    }).addTo(map);

    map.on("move zoom resize", updateSelectedPoint);
    mapRef.current = map;
    setMapReady(true);

    const invalidate = window.setTimeout(() => {
      map.invalidateSize();
      updateSelectedPoint();
    }, 0);

    return () => {
      window.clearTimeout(invalidate);
      map.off("move zoom resize", updateSelectedPoint);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      radiusCircleRef.current?.remove();
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [radiusCenter, radiusKm, updateSelectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    radiusCircleRef.current?.remove();
    radiusCircleRef.current = null;
    if (radiusKm <= 0) {
      return;
    }

    radiusCircleRef.current = L.circle(toLatLng(radiusCenter), {
      color: "rgba(37, 99, 235, 0.35)",
      fillColor: "rgba(37, 99, 235, 0.10)",
      fillOpacity: 1,
      radius: radiusKm * 1000,
      weight: 2
    }).addTo(map);
  }, [mapReady, radiusCenter, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    userMarkerRef.current?.remove();
    userMarkerRef.current = null;

    if (hasDeviceLocation) {
      userMarkerRef.current = L.marker(toLatLng(radiusCenter), {
        icon: createUserIcon(),
        interactive: false,
        zIndexOffset: 1000
      }).addTo(map);
    }
  }, [hasDeviceLocation, mapReady, radiusCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    events.forEach((event) => {
      const marker = L.marker(toLatLng(event.coordinates), {
        icon: createEventIcon(event, selectedEvent?.id === event.id),
        title: event.title,
        zIndexOffset: selectedEvent?.id === event.id ? 500 : 1
      });
      marker.on("click", () => onSelectEvent(event));
      marker.addTo(map);
      markersRef.current.set(event.id, marker);
    });

    updateSelectedPoint();
  }, [events, mapReady, onSelectEvent, selectedEvent?.id, updateSelectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    if (events.length > 0) {
      const boundsCoordinates: LatLngExpression[] = [
        ...events.map((event) => toLatLng(event.coordinates)),
        toLatLng(radiusCenter)
      ];
      const bounds = L.latLngBounds(boundsCoordinates);
      map.fitBounds(bounds, {
        animate: true,
        maxZoom: 15,
        paddingBottomRight: [44, 190],
        paddingTopLeft: [44, 72]
      });
    } else {
      map.setView(toLatLng(radiusCenter), zoomFromRadius(radiusKm), { animate: true });
    }
  }, [events, mapReady, radiusCenter, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selectedEvent) {
      setSelectedPoint(null);
      return;
    }

    map.panTo(toLatLng(selectedEvent.coordinates), { animate: true });
    updateSelectedPoint();
  }, [mapReady, selectedEvent, updateSelectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    map.invalidateSize();
    updateSelectedPoint();
  }, [mapReady, mapSize.height, mapSize.width, updateSelectedPoint]);

  const selectedCardStyle =
    selectedPoint && selectedEvent
      ? cardPosition(selectedPoint, mapSize.width, mapSize.height)
      : undefined;

  return (
    <View
      onLayout={(event) => setMapSize(event.nativeEvent.layout)}
      style={fullscreen ? styles.fullscreenMapFrame : styles.mapFrame}
    >
      {createElement("div", {
        ref: (node: HTMLDivElement | null) => {
          mapElementRef.current = node;
        },
        style: leafletContainerStyle
      })}

      <View style={[styles.mapControlStack, fullscreen && styles.fullscreenMapControlStack]}>
        <Pressable
          accessibilityLabel="Filtri mappa"
          accessibilityRole="button"
          onPress={onFilter}
          style={styles.mapControlButton}
        >
          <Ionicons color={colors.ink} name="options-outline" size={21} />
          {activeFilterCount > 0 && (
            <View style={styles.controlBadge}>
              <Text style={styles.controlBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        {hasDeviceLocation ? (
          <Pressable
            accessibilityLabel="Centra sulla mia posizione"
            accessibilityRole="button"
            onPress={onLocate}
            style={styles.mapControlButton}
          >
            <Ionicons color={colors.ink} name="locate-outline" size={21} />
          </Pressable>
        ) : null}
        {fullscreen ? (
          <Pressable
            accessibilityLabel="Chiudi mappa a schermo intero"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.mapControlButton}
          >
            <Ionicons color={colors.ink} name="contract-outline" size={22} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityLabel="Apri mappa a schermo intero"
            accessibilityRole="button"
            onPress={onExpand}
            style={styles.mapControlButton}
          >
            <Ionicons color={colors.ink} name="expand-outline" size={21} />
          </Pressable>
        )}
      </View>

      {selectedEvent && selectedCardStyle && (
        <PoiPreviewCard
          distanceKm={eventDistances[selectedEvent.id] ?? selectedEvent.distanceKm}
          event={selectedEvent}
          favorite={favorites.has(selectedEvent.id)}
          onOpen={() => onOpenEvent(selectedEvent)}
          onToggleFavorite={() => onToggleFavorite(selectedEvent.id)}
          registered={registrations.has(selectedEvent.id)}
          style={[styles.poiCardFloating, selectedCardStyle]}
        />
      )}
    </View>
  );
}

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
            name={favorite ? "star" : "star-outline"}
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
    paddingBottom: spacing.xs
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
  mapFrame: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    position: "relative",
    ...shadow
  },
  fullscreenMapFrame: {
    backgroundColor: colors.surface,
    flex: 1,
    overflow: "hidden",
    position: "relative"
  },
  fullscreenMapControlStack: {
    top: 64
  },
  fullscreenFilterOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    bottom: 0,
    justifyContent: "flex-end",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2000
  },
  mapControlStack: {
    gap: spacing.sm,
    position: "absolute",
    right: spacing.md,
    top: spacing.md,
    zIndex: 1001
  },
  mapControlButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "relative",
    width: 42,
    ...shadow
  },
  controlBadge: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 8,
    height: 16,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    top: -2,
    width: 16
  },
  controlBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900"
  },
  locateButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
    ...shadow
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
    zIndex: 1000,
    ...shadow
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
    top: spacing.xl,
    width: 44,
    zIndex: 1001,
    ...shadow
  },
  fullscreenRoot: {
    backgroundColor: colors.background,
    flex: 1
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
  poiCardFloating: {
    position: "absolute",
    zIndex: 1002
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
  emptyCopy: {
    flex: 1,
    gap: 2
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
  }
});

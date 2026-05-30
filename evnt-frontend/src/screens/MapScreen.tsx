import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

type RadiusOption = 1 | 3 | 5 | 10 | 25;

const radiusOptions: RadiusOption[] = [1, 3, 5, 10, 25];

function formatPrice(price: number) {
  return price === 0 ? "Gratis" : `EUR ${price}`;
}

function formatSeats(event: EvntEvent) {
  return event.capacity ? `${event.participants}/${event.capacity} posti` : "Posti illimitati";
}

function pinPosition(event: EvntEvent) {
  const latitude = event.coordinates.latitude;
  const longitude = event.coordinates.longitude;
  const left = Math.max(10, Math.min(88, 50 + (longitude - 14.761) * 900));
  const top = Math.max(10, Math.min(82, 52 - (latitude - 40.6815) * 900));
  return { left: `${left}%` as const, top: `${top}%` as const };
}

export function MapScreen({
  events,
  favorites,
  registrations,
  onOpenEvent,
  onToggleFavorite
}: MapScreenProps) {
  const [category, setCategory] = useState<Category | "Tutti">("Tutti");
  const [radiusKm, setRadiusKm] = useState<RadiusOption>(10);
  const [selectedEventId, setSelectedEventId] = useState(events[0]?.id);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const matchesCategory = category === "Tutti" || event.category === category;
        return matchesCategory && event.distanceKm <= radiusKm;
      }),
    [category, events, radiusKm]
  );

  const selectedEvent =
    filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0];

  const selectEvent = (event: EvntEvent) => {
    setSelectedEventId(event.id);
  };

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
        <View style={styles.mapCanvas}>
          <View style={styles.radiusCircle} />
          <View style={[styles.road, styles.roadOne]} />
          <View style={[styles.road, styles.roadTwo]} />
          <View style={styles.seaBand} />
          <View style={styles.userPin}>
            <Ionicons color={colors.surface} name="navigate" size={15} />
          </View>

          {filteredEvents.map((event) => {
            const isSelected = selectedEvent?.id === event.id;
            return (
              <Pressable
                accessibilityLabel={`Apri anteprima ${event.title}`}
                key={event.id}
                onPress={() => selectEvent(event)}
                style={[
                  styles.pin,
                  pinPosition(event),
                  {
                    backgroundColor: categoryColors[event.category],
                    borderColor: categorySoftColors[event.category]
                  },
                  isSelected && styles.pinSelected
                ]}
              >
                <Ionicons color={colors.surface} name="location" size={18} />
              </Pressable>
            );
          })}
        </View>

        {selectedEvent && (
          <PoiPreviewCard
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
          <Ionicons color={colors.ink} name="globe-outline" size={20} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>Anteprima web</Text>
          <Text style={styles.locationText}>
            Su iOS e Android questa schermata usa la mappa reale con geolocalizzazione.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

type PoiPreviewCardProps = {
  event: EvntEvent;
  favorite: boolean;
  registered: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
};

function PoiPreviewCard({
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
            {event.place} · {event.distanceKm.toFixed(1)} km
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
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
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
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44
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
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center"
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  favoriteButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.xl
  },
  filterScroller: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg
  },
  header: {
    gap: spacing.xs,
    paddingTop: spacing.sm
  },
  locationCopy: {
    flex: 1,
    gap: 2
  },
  locationIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 44,
    justifyContent: "center",
    width: 44
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
  locationText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  locationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  mapCanvas: {
    backgroundColor: "#EAF4E5",
    flex: 1,
    overflow: "hidden",
    position: "relative"
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
  pin: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 4,
    height: 36,
    justifyContent: "center",
    marginLeft: -18,
    marginTop: -18,
    position: "absolute",
    width: 36,
    ...shadow
  },
  pinSelected: {
    transform: [{ scale: 1.14 }]
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
  poiDot: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
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
  poiStatText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  poiStats: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  poiTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22
  },
  poiTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
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
  radiusCircle: {
    borderColor: "rgba(37, 99, 235, 0.35)",
    borderRadius: 130,
    borderWidth: 2,
    height: 260,
    left: "50%",
    marginLeft: -130,
    marginTop: -130,
    position: "absolute",
    top: "50%",
    width: 260
  },
  radiusHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  radiusOptions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  radiusSection: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
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
  registeredText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900"
  },
  road: {
    backgroundColor: "#FFF9ED",
    borderColor: "#DCCFBA",
    borderWidth: 1,
    height: 28,
    position: "absolute",
    width: 520
  },
  roadOne: {
    left: -90,
    top: 130,
    transform: [{ rotate: "-22deg" }]
  },
  roadTwo: {
    left: -70,
    top: 220,
    transform: [{ rotate: "18deg" }]
  },
  seaBand: {
    backgroundColor: "#BFDCEB",
    bottom: -50,
    height: 140,
    left: -40,
    position: "absolute",
    right: -40,
    transform: [{ rotate: "-7deg" }]
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "900"
  },
  userPin: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderColor: colors.surface,
    borderRadius: 18,
    borderWidth: 3,
    height: 36,
    justifyContent: "center",
    left: "50%",
    marginLeft: -18,
    marginTop: -18,
    position: "absolute",
    top: "50%",
    width: 36
  }
});

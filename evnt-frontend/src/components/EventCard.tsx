import { Feather, Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  categoryColors,
  categoryDefaultImages,
  categoryEmojis,
  categorySoftColors,
  getEventSubcategoryLabel
} from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent } from "../types";
import { PillButton } from "./PillButton";

type EventCardProps = {
  event: EvntEvent;
  favorite: boolean;
  registered?: boolean;
  compact?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

export function EventCard({
  event,
  favorite,
  registered = false,
  compact = false,
  onPress,
  onToggleFavorite
}: EventCardProps) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];
  const imageUri = event.image || categoryDefaultImages[event.category];
  const categoryLabel = getEventSubcategoryLabel(event);
  const seatsLabel = event.capacity
    ? `${event.participants}/${event.capacity}`
    : `${event.participants}+`;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Pressable accessibilityLabel={`Apri evento ${event.title}`} accessibilityRole="button" onPress={onPress}>
        <Image source={{ uri: imageUri }} style={[styles.image, compact && styles.compactImage]} />
      </Pressable>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <PillButton accent={accent} emoji={emoji} label={categoryLabel} soft={soft} />
          <Pressable
            accessibilityLabel={favorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            accessibilityRole="button"
            onPress={onToggleFavorite}
            style={styles.iconButton}
          >
            <Ionicons
              color={favorite ? colors.teal : colors.ink}
              name={favorite ? "heart" : "heart-outline"}
              size={20}
            />
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel={`Apri evento ${event.title}`}
          accessibilityRole="button"
          onPress={onPress}
          style={styles.cardPressArea}
        >
          <Text numberOfLines={2} style={styles.title}>
            {event.title}
          </Text>

          <View style={styles.metaRow}>
            <Feather color={colors.muted} name="calendar" size={14} />
            <Text style={styles.metaText}>
              {event.date} · {event.time}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Feather color={colors.muted} name="map-pin" size={14} />
            <Text numberOfLines={1} style={styles.metaText}>
              {event.place} · {event.distanceKm.toFixed(1)} km
            </Text>
          </View>

          {!compact && (
            <View style={styles.footer}>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{event.affinity}%</Text>
                <Text style={styles.metricLabel}>affinita</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricValue}>{seatsLabel}</Text>
                <Text style={styles.metricLabel}>posti</Text>
              </View>
              <View style={[styles.pricePill, registered && styles.registeredPill]}>
                <Text style={[styles.priceLabel, registered && styles.registeredLabel]}>
                  {registered ? "Iscritto" : event.price === 0 ? "Gratis" : `EUR ${event.price}`}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadow
  },
  compactCard: {
    flexDirection: "row",
    marginBottom: spacing.md
  },
  image: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceMuted,
    width: "100%"
  },
  compactImage: {
    aspectRatio: 1,
    width: 108
  },
  content: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  cardPressArea: {
    gap: spacing.sm
  },
  topLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  iconButton: {
    alignItems: "center",
    height: 32,
    justifyContent: "center",
    width: 32
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 23
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  metaText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    fontWeight: "600"
  },
  footer: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.xs,
    padding: spacing.md
  },
  metric: {
    minWidth: 68
  },
  metricValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  pricePill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  registeredPill: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.tealSoft
  },
  priceLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  registeredLabel: {
    color: colors.teal
  }
});

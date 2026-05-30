import { Feather, Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent } from "../types";

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
  const seatsLabel = event.capacity
    ? `${event.participants}/${event.capacity}`
    : `${event.participants}+`;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.card, compact && styles.compactCard]}>
      <Image source={{ uri: event.image }} style={[styles.image, compact && styles.compactImage]} />
      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={[styles.badge, { backgroundColor: soft, borderColor: accent }]}>
            <Text style={styles.badgeEmoji}>{emoji}</Text>
            <Text style={[styles.badgeLabel, { color: accent }]}>{event.category}</Text>
          </View>
          <Pressable
            accessibilityLabel={favorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
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
      </View>
    </Pressable>
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
    padding: spacing.md
  },
  topLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  badge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: 5
  },
  badgeEmoji: {
    fontSize: 13
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "900"
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
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.md
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
    backgroundColor: "#F7F3EA",
    borderColor: "#EFE7D8",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  registeredPill: {
    backgroundColor: colors.tealSoft,
    borderColor: colors.tealSoft
  },
  priceLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  registeredLabel: {
    color: colors.teal
  }
});

import { Feather, Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  categoryColors,
  categoryEmojis,
  categorySoftColors,
  getEventImage,
  getEventSubcategoryLabel
} from "../data/events";
import { colors, hitSlop, radius, shadow, spacing, typography } from "../theme";
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
  const imageUri = getEventImage(event);
  const categoryLabel = getEventSubcategoryLabel(event);
  const seatsLabel = event.capacity
    ? `${event.participants}/${event.capacity}`
    : `${event.participants}+`;
  const priceLabel = event.price === 0 ? "Gratis" : `EUR ${event.price}`;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <Pressable
        accessibilityLabel={`Apri evento ${event.title}`}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.imageButton, compact && styles.compactImageButton]}
      >
        <Image resizeMode="cover" source={{ uri: imageUri }} style={styles.image} />
        {registered ? (
          <View style={styles.imageBadge}>
            <Ionicons color={colors.green} name="checkmark" size={13} />
          </View>
        ) : null}
      </Pressable>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <PillButton
            accent={accent}
            emoji={emoji}
            label={categoryLabel}
            soft={soft}
            style={styles.categoryPill}
          />
          <Pressable
            accessibilityLabel={favorite ? "Rimuovi dai preferiti" : "Salva nei preferiti"}
            accessibilityRole="button"
            hitSlop={hitSlop}
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

          <View style={styles.metaStack}>
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
          </View>

          {!compact && (
            <View style={styles.footer}>
              <View style={styles.footerMetrics}>
                <Metric value={`${event.affinity}%`} label="affinita" />
                <Metric value={seatsLabel} label="posti" />
              </View>
              <View style={[styles.pricePill, registered && styles.registeredPill]}>
                <Text style={[styles.priceLabel, registered && styles.registeredLabel]}>
                  {registered ? "Iscritto" : priceLabel}
                </Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadow
  },
  compactCard: {
    marginBottom: spacing.md
  },
  imageButton: {
    backgroundColor: colors.surfaceMuted,
    minHeight: 148,
    position: "relative",
    width: 124
  },
  compactImageButton: {
    minHeight: 112,
    width: 96
  },
  image: {
    backgroundColor: colors.surfaceMuted,
    height: "100%",
    width: "100%"
  },
  imageBadge: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 28
  },
  content: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.md
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
  categoryPill: {
    minWidth: 0,
    maxWidth: "82%"
  },
  title: {
    ...typography.title,
    fontSize: 17,
    lineHeight: 21
  },
  metaStack: {
    gap: spacing.xs
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  metaText: {
    ...typography.meta,
    flex: 1,
    fontWeight: "600"
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  footerMetrics: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md
  },
  metric: {
    minWidth: 54
  },
  metricValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  pricePill: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 78,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  registeredPill: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0"
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

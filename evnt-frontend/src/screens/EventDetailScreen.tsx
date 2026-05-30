import { Feather, Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { categoryColors, categoryEmojis, categorySoftColors } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { EvntEvent } from "../types";

type EventDetailScreenProps = {
  event: EvntEvent;
  favorite: boolean;
  registered: boolean;
  onBack: () => void;
  onOpenInbox: () => void;
  onToggleFavorite: () => void;
  onToggleRegistration: () => void;
};

export function EventDetailScreen({
  event,
  favorite,
  registered,
  onBack,
  onOpenInbox,
  onToggleFavorite,
  onToggleRegistration
}: EventDetailScreenProps) {
  const accent = categoryColors[event.category];
  const emoji = categoryEmojis[event.category];
  const soft = categorySoftColors[event.category];
  const priceLabel = event.price === 0 ? "Gratis" : `EUR ${event.price}`;
  const seatsLabel = event.capacity
    ? `${event.participants}/${event.capacity}`
    : `${event.participants}+`;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: event.image }} style={styles.image} />
          <View style={styles.topActions}>
            <Pressable accessibilityLabel="Torna indietro" onPress={onBack} style={styles.roundButton}>
              <Ionicons color={colors.ink} name="chevron-back" size={24} />
            </Pressable>
            <Pressable
              accessibilityLabel={favorite ? "Rimuovi preferito" : "Aggiungi preferito"}
              onPress={onToggleFavorite}
              style={styles.roundButton}
            >
              <Ionicons color={favorite ? colors.primary : colors.ink} name={favorite ? "heart" : "heart-outline"} size={22} />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.categoryBadge, { backgroundColor: soft, borderColor: accent }]}>
            <Text style={styles.categoryEmoji}>{emoji}</Text>
            <Text style={[styles.categoryText, { color: accent }]}>{event.category}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoGrid}>
            <InfoCell icon="calendar" label="Quando" value={`${event.date} · ${event.time}`} />
            <InfoCell icon="map-pin" label="Dove" value={event.place} />
            <InfoCell icon="users" label="Posti" value={seatsLabel} />
            <InfoCell icon="credit-card" label="Costo" value={priceLabel} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Luogo</Text>
            <View style={styles.addressCard}>
              <View style={styles.miniMap}>
                <View style={styles.mapRoad} />
                <View style={styles.mapPin}>
                  <Ionicons color={colors.surface} name="location" size={16} />
                </View>
              </View>
              <View style={styles.addressCopy}>
                <Text style={styles.addressTitle}>{event.address}</Text>
                <Text style={styles.addressMeta}>{event.distanceKm.toFixed(1)} km da te</Text>
              </View>
              <Ionicons color={colors.teal} name="navigate-outline" size={22} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Canale</Text>
            <Pressable onPress={onOpenInbox} style={styles.channelCard}>
              <View style={styles.channelIcon}>
                <Ionicons color={colors.teal} name="chatbubbles-outline" size={22} />
              </View>
              <View style={styles.channelCopy}>
                <Text style={styles.channelTitle}>{event.chatMode}</Text>
                <Text style={styles.channelText}>Organizzatore: {event.organizer}</Text>
              </View>
              <Ionicons color={colors.muted} name="chevron-forward" size={20} />
            </Pressable>
          </View>

          <View style={styles.tags}>
            {event.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <View>
          <Text style={styles.ctaPrice}>{priceLabel}</Text>
          <Text style={styles.ctaMeta}>{registered ? "Partecipazione confermata" : "Pagamento simulato"}</Text>
        </View>
        <Pressable onPress={onToggleRegistration} style={[styles.ctaButton, registered && styles.ctaButtonActive]}>
          <Text style={styles.ctaText}>{registered ? "Annulla" : "Partecipa"}</Text>
          <Ionicons color={colors.surface} name={registered ? "close" : "checkmark"} size={18} />
        </Pressable>
      </View>
    </View>
  );
}

type InfoCellProps = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
};

function InfoCell({ icon, label, value }: InfoCellProps) {
  return (
    <View style={styles.infoCell}>
      <Feather color={colors.primary} name={icon} size={17} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  container: {
    paddingBottom: 116
  },
  imageWrap: {
    backgroundColor: colors.surfaceMuted,
    height: 330,
    position: "relative"
  },
  image: {
    height: "100%",
    width: "100%"
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    top: spacing.xl
  },
  roundButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  content: {
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.lg
  },
  categoryBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  categoryEmoji: {
    fontSize: 16
  },
  categoryText: {
    fontSize: 16,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  description: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  infoCell: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 108,
    padding: spacing.md
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  infoValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900"
  },
  addressCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  miniMap: {
    backgroundColor: "#DDEEDB",
    borderRadius: radius.sm,
    height: 64,
    overflow: "hidden",
    position: "relative",
    width: 80
  },
  mapRoad: {
    backgroundColor: "#FFF8EA",
    height: 18,
    left: -14,
    position: "absolute",
    top: 26,
    transform: [{ rotate: "-24deg" }],
    width: 116
  },
  mapPin: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 14,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    left: 28,
    position: "absolute",
    top: 18,
    width: 28
  },
  addressCopy: {
    flex: 1
  },
  addressTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  addressMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  channelCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  channelIcon: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  channelCopy: {
    flex: 1
  },
  channelTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  channelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  tag: {
    backgroundColor: "#F5EDFF",
    borderColor: "#E2D7FF",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  tagText: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900"
  },
  ctaBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0,
    ...shadow
  },
  ctaPrice: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  ctaMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  ctaButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    minWidth: 144,
    paddingHorizontal: spacing.lg
  },
  ctaButtonActive: {
    backgroundColor: colors.danger
  },
  ctaText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});

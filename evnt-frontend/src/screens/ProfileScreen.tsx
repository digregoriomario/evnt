import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CategoryChip } from "../components/CategoryChip";
import { EmptyState } from "../components/EmptyState";
import { EventCard } from "../components/EventCard";
import { colors, radius, spacing } from "../theme";
import { EvntEvent, UserProfile } from "../types";

type ProfileScreenProps = {
  createdCount: number;
  events: EvntEvent[];
  favorites: Set<string>;
  registrations: Set<string>;
  user: UserProfile;
  onLogout: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onToggleFavorite: (eventId: string) => void;
};

export function ProfileScreen({
  createdCount,
  events,
  favorites,
  registrations,
  user,
  onLogout,
  onOpenEvent,
  onToggleFavorite
}: ProfileScreenProps) {
  const registeredEvents = events.filter((event) => registrations.has(event.id));
  const favoriteEvents = events.filter((event) => favorites.has(event.id));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {user.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.meta}>{user.city} · 16+ verificato</Text>
        </View>
        <Pressable accessibilityLabel="Logout" onPress={onLogout} style={styles.iconButton}>
          <Ionicons color={colors.muted} name="log-out-outline" size={22} />
        </Pressable>
      </View>

      <Text style={styles.bio}>{user.bio}</Text>

      <View style={styles.chips}>
        {user.interests.map((interest) => (
          <CategoryChip category={interest} key={interest} selected />
        ))}
      </View>

      <View style={styles.stats}>
        <Stat value={String(registrations.size)} label="seguiti" />
        <Stat value={String(createdCount)} label="creati" />
        <Stat value={String(favorites.size)} label="preferiti" />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Prossime iscrizioni</Text>
          <Text style={styles.sectionMeta}>{registeredEvents.length}</Text>
        </View>
        {registeredEvents.length === 0 ? (
          <EmptyState
            body="Gli eventi a cui ti iscrivi appariranno qui."
            icon="ticket-outline"
            title="Nessuna iscrizione"
          />
        ) : (
          registeredEvents.map((event) => (
            <EventCard
              compact
              event={event}
              favorite={favorites.has(event.id)}
              key={event.id}
              onPress={() => onOpenEvent(event)}
              onToggleFavorite={() => onToggleFavorite(event.id)}
              registered
            />
          ))
        )}
      </View>

      {favoriteEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferiti</Text>
            <Text style={styles.sectionMeta}>{favoriteEvents.length}</Text>
          </View>
          {favoriteEvents.map((event) => (
            <EventCard
              compact
              event={event}
              favorite
              key={event.id}
              onPress={() => onOpenEvent(event)}
              onToggleFavorite={() => onToggleFavorite(event.id)}
              registered={registrations.has(event.id)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

type StatProps = {
  label: string;
  value: string;
};

function Stat({ label, value }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  profileHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    height: 64,
    justifyContent: "center",
    overflow: "hidden",
    width: 64
  },
  avatarText: {
    color: colors.surface,
    fontSize: 26,
    fontWeight: "900"
  },
  avatarImage: {
    height: "100%",
    width: "100%"
  },
  profileCopy: {
    flex: 1
  },
  name: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900"
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  bio: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  stats: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.md
  },
  stat: {
    alignItems: "center",
    flex: 1
  },
  statValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  section: {
    gap: spacing.md
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900"
  },
  sectionMeta: {
    color: colors.teal,
    fontSize: 14,
    fontWeight: "900"
  }
});

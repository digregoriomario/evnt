import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { CategoryChip } from "../components/CategoryChip";
import { EmptyState } from "../components/EmptyState";
import { EventCard } from "../components/EventCard";
import { LocationFallbackBanner } from "../components/LocationFallbackBanner";
import { NotificationsModal } from "../components/NotificationsModal";
import { PillButton } from "../components/PillButton";
import { type Notification } from "../api";
import { cityMatches } from "../data/cities";
import { categories } from "../data/events";
import { colors, radius, spacing } from "../theme";
import { Category, Coordinates, EvntEvent, LocationStatus, UserProfile } from "../types";

type HomeScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  locationStatus: LocationStatus;
  notifications: Notification[];
  registrations: Set<string>;
  user: UserProfile;
  onMarkAllNotificationsRead: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onOpenNotification: (notification: Notification) => void;
  onRefresh: () => Promise<void>;
  onRequestLocation: () => Promise<Coordinates | null>;
  onToggleFavorite: (eventId: string) => void;
  userCoordinates: Coordinates | null;
};

type PriceFilter = "tutti" | "gratis" | "pagamento";

export function HomeScreen({
  events,
  favorites,
  locationStatus,
  notifications,
  registrations,
  user,
  onMarkAllNotificationsRead,
  onOpenEvent,
  onOpenNotification,
  onRefresh,
  onRequestLocation,
  onToggleFavorite,
  userCoordinates
}: HomeScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category | "Tutti">("Tutti");
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState<PriceFilter>("tutti");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const usesCityFallback = locationStatus !== "granted" || userCoordinates === null;
  const showLocationFallbackNotice = usesCityFallback && locationStatus !== "loading";
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return events
      .filter((event) => {
        const matchesFallbackCity = !usesCityFallback || cityMatches(event.city, user.city);
        const matchesCategory = selectedCategory === "Tutti" || event.category === selectedCategory;
        const matchesQuery =
          normalized.length === 0 ||
          event.title.toLowerCase().includes(normalized) ||
          event.place.toLowerCase().includes(normalized) ||
          event.city.toLowerCase().includes(normalized);
        const matchesPrice =
          price === "tutti" ||
          (price === "gratis" && event.price === 0) ||
          (price === "pagamento" && event.price > 0);
        return matchesFallbackCity && matchesCategory && matchesQuery && matchesPrice;
      })
      .sort((a, b) => b.affinity - a.affinity || a.distanceKm - b.distanceKm);
  }, [events, price, query, selectedCategory, user.city, usesCityFallback]);

  const activeFilterCount =
    (selectedCategory === "Tutti" ? 0 : 1) + (price === "tutti" ? 0 : 1) + (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setSelectedCategory("Tutti");
    setPrice("tutti");
    setQuery("");
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.container}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Ciao, {user.name}</Text>
          <Pressable
            accessibilityLabel={`Notifiche${unreadNotifications > 0 ? `, ${unreadNotifications} da leggere` : ""}`}
            accessibilityRole="button"
            onPress={() => setNotificationsOpen(true)}
            style={styles.notificationButton}
          >
            <Ionicons color={colors.ink} name="notifications-outline" size={21} />
            {unreadNotifications > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{Math.min(unreadNotifications, 9)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {showLocationFallbackNotice && (
          <LocationFallbackBanner city={user.city} onRetry={() => void onRequestLocation()} />
        )}

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons color={colors.muted} name="search-outline" size={20} />
            <TextInput
              accessibilityLabel="Cerca eventi"
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder="Cerca eventi"
              placeholderTextColor={colors.muted}
              style={styles.searchInput}
              value={query}
            />
            {query.length > 0 && (
              <Pressable accessibilityLabel="Cancella ricerca" accessibilityRole="button" onPress={() => setQuery("")}>
                <Ionicons color={colors.muted} name="close-circle" size={20} />
              </Pressable>
            )}
          </View>

          <Pressable
            accessibilityLabel="Filtri eventi"
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

        <View style={styles.feedHeader}>
          <View>
            <Text style={styles.sectionTitle}>Eventi</Text>
            <Text style={styles.sectionMeta}>
              {filteredEvents.length} risultati{usesCityFallback ? ` a ${user.city}` : ""}
            </Text>
          </View>
          {activeFilterCount > 0 && (
            <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}>
              <Text style={styles.clearText}>Reset</Text>
            </Pressable>
          )}
        </View>

        {filteredEvents.length === 0 ? (
          <EmptyState
            body={
              usesCityFallback
                ? `Non ci sono eventi a ${user.city} con questi filtri.`
                : "Modifica ricerca o filtri per vedere altri eventi."
            }
            icon="calendar-clear-outline"
            title="Nessun evento trovato"
          />
        ) : (
          filteredEvents.map((event) => (
            <EventCard
              event={event}
              favorite={favorites.has(event.id)}
              key={event.id}
              onPress={() => onOpenEvent(event)}
              onToggleFavorite={() => onToggleFavorite(event.id)}
              registered={registrations.has(event.id)}
            />
          ))
        )}
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setFiltersOpen(false)} transparent visible={filtersOpen}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filtri</Text>
              <Pressable
                accessibilityLabel="Chiudi filtri"
                accessibilityRole="button"
                onPress={() => setFiltersOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons color={colors.ink} name="close" size={22} />
              </Pressable>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Categoria</Text>
              <View style={styles.optionGrid}>
                <FilterOption
                  label="Tutte"
                  selected={selectedCategory === "Tutti"}
                  onPress={() => setSelectedCategory("Tutti")}
                />
                {categories.map((category) => (
                  <CategoryChip
                    category={category}
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    selected={selectedCategory === category}
                  />
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Prezzo</Text>
              <View style={styles.optionGrid}>
                <FilterOption label="Tutti" selected={price === "tutti"} onPress={() => setPrice("tutti")} />
                <FilterOption label="Gratis" selected={price === "gratis"} onPress={() => setPrice("gratis")} />
                <FilterOption
                  label="A pagamento"
                  selected={price === "pagamento"}
                  onPress={() => setPrice("pagamento")}
                />
              </View>
            </View>

            <View style={styles.sheetActions}>
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Cancella</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} style={styles.primaryAction}>
                <Text style={styles.primaryActionText}>Mostra eventi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationsModal
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onMarkAllRead={onMarkAllNotificationsRead}
        onPressNotification={(notification) => {
          setNotificationsOpen(false);
          onOpenNotification(notification);
        }}
        visible={notificationsOpen}
      />
    </>
  );
}

type FilterOptionProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

function FilterOption({ label, onPress, selected }: FilterOptionProps) {
  return (
    <PillButton
      accessibilityLabel={`Filtro ${label}`}
      accent={selected ? "#5A4BC4" : colors.ink}
      label={label}
      onPress={onPress}
      selected={selected}
      soft={selected ? "#F0EEFF" : colors.surfaceMuted}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingTop: spacing.sm
  },
  locationBanner: {
    alignItems: "center",
    backgroundColor: "#FFF7DF",
    borderColor: "#F3D28A",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  locationBannerCopy: {
    flex: 1,
    gap: 2
  },
  locationBannerIcon: {
    alignItems: "center",
    backgroundColor: "#FFE9A8",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  locationBannerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  locationBannerTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  locationRetry: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  locationRetryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36
  },
  notificationButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    position: "relative",
    width: 44
  },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderColor: colors.surface,
    borderRadius: 9,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    top: -4,
    width: 18
  },
  notificationBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900"
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md
  },
  searchInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "600"
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
  feedHeader: {
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
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  clearButton: {
    borderColor: colors.line,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  clearText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  modalOverlay: {
    backgroundColor: "rgba(17, 24, 39, 0.32)",
    flex: 1,
    justifyContent: "flex-end"
  },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.xl,
    padding: spacing.xl
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  filterSection: {
    gap: spacing.md
  },
  filterLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 50
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 50
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});

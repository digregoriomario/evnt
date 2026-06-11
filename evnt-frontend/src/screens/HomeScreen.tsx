import { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { EmptyState } from "../components/EmptyState";
import { EventCard } from "../components/EventCard";
import { IconButton } from "../components/IconButton";
import { LocationFallbackBanner } from "../components/LocationFallbackBanner";
import { MapFiltersModal } from "../components/MapFiltersModal";
import { NotificationsModal } from "../components/NotificationsModal";
import { SearchField } from "../components/SearchField";
import { type Notification } from "../api";
import { buildEventFilterResult, eventRadiusOptions } from "../application/events/eventFiltering";
import { colors, radius, spacing } from "../theme";
import { Coordinates, EventFilterState, EvntEvent, LocationStatus, UserProfile } from "../types";

type HomeScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  locationStatus: LocationStatus;
  notifications: Notification[];
  registrations: Set<string>;
  user: UserProfile;
  filters: EventFilterState;
  onDeleteAllNotifications: () => void;
  onDeleteNotification: (notificationId: number) => void;
  onFiltersChange: (updates: Partial<EventFilterState>) => void;
  onMarkAllNotificationsRead: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onOpenNotification: (notification: Notification) => void;
  onRefresh: () => Promise<void>;
  onRequestLocation: () => Promise<Coordinates | null>;
  onResetFilters: () => void;
  onToggleFavorite: (eventId: string) => void;
  userCoordinates: Coordinates | null;
};

export function HomeScreen({
  events,
  favorites,
  locationStatus,
  notifications,
  registrations,
  user,
  filters,
  onDeleteAllNotifications,
  onDeleteNotification,
  onFiltersChange,
  onMarkAllNotificationsRead,
  onOpenEvent,
  onOpenNotification,
  onRefresh,
  onRequestLocation,
  onResetFilters,
  onToggleFavorite,
  userCoordinates
}: HomeScreenProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const usesCityFallback = locationStatus !== "granted" || userCoordinates === null;
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const { activeFilterCount, filteredEvents, showLocationFallbackNotice } = useMemo(
    () =>
      buildEventFilterResult({
        events,
        filters,
        locationStatus,
        sort: "feed",
        user,
        userCoordinates
      }),
    [events, filters, locationStatus, user, userCoordinates]
  );

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
          <IconButton
            accessibilityLabel={`Notifiche${unreadNotifications > 0 ? `, ${unreadNotifications} da leggere` : ""}`}
            badgeCount={unreadNotifications}
            icon="notifications-outline"
            onPress={() => setNotificationsOpen(true)}
          />
        </View>

        {showLocationFallbackNotice && (
          <LocationFallbackBanner city={user.city} onRetry={() => void onRequestLocation()} />
        )}

        <View style={styles.searchRow}>
          <SearchField
            accessibilityLabel="Cerca eventi"
            onChangeText={(query) => onFiltersChange({ query })}
            placeholder="Cerca eventi"
            style={styles.searchField}
            value={filters.query}
          />

          <IconButton
            accessibilityLabel="Filtri eventi"
            badgeCount={activeFilterCount}
            icon="options-outline"
            size="lg"
            onPress={() => setFiltersOpen(true)}
          />
        </View>

        <View style={styles.feedHeader}>
          <View>
            <Text style={styles.sectionTitle}>Eventi</Text>
            <Text style={styles.sectionMeta}>
              {filteredEvents.length} risultati{usesCityFallback ? ` a ${user.city}` : ""}
            </Text>
          </View>
          {activeFilterCount > 0 && (
            <Pressable accessibilityRole="button" onPress={onResetFilters} style={styles.clearButton}>
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
        radiusKm={filters.radiusKm}
        radiusOptions={[...eventRadiusOptions]}
        visible={filtersOpen}
      />

      <NotificationsModal
        notifications={notifications}
        onClose={() => setNotificationsOpen(false)}
        onDeleteAll={onDeleteAllNotifications}
        onDeleteNotification={onDeleteNotification}
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
  title: {
    color: colors.ink,
    flex: 1,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 36
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  searchField: {
    flex: 1,
    minHeight: 52
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
});

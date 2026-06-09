import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { CategoryChip } from "../components/CategoryChip";
import { EventCard } from "../components/EventCard";
import { FormField } from "../components/FormField";
import { ProfileImagePicker } from "../components/ProfileImagePicker";
import { searchCitiesWorldwide } from "../api/geocoding";
import { citySuggestions, type CitySuggestion } from "../data/cities";
import { categories } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, EvntEvent, UserProfile } from "../types";

type ProfileScreenProps = {
  events: EvntEvent[];
  favorites: Set<string>;
  registrations: Set<string>;
  user: UserProfile;
  onLogout: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onToggleFavorite: (eventId: string) => void;
  onUpdateProfile: (profile: UserProfile) => Promise<{ ok: boolean; message?: string }>;
};

type ProfileEventSectionKey = "created" | "favorites" | "registered";

function citySuggestionKey(suggestion: CitySuggestion, index: number) {
  const { latitude, longitude } = suggestion.coordinates;
  return [
    suggestion.name,
    suggestion.province,
    latitude.toFixed(5),
    longitude.toFixed(5),
    index
  ].join("-");
}

export function ProfileScreen({
  events,
  favorites,
  registrations,
  user,
  onLogout,
  onOpenEvent,
  onToggleFavorite,
  onUpdateProfile
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [remoteCitySuggestions, setRemoteCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<ProfileEventSectionKey, boolean>>({
    created: false,
    favorites: false,
    registered: false
  });
  const registeredEvents = events.filter((event) => registrations.has(event.id));
  const favoriteEvents = events.filter((event) => favorites.has(event.id));
  const createdEvents = events.filter(
    (event) => event.organizer.trim().toLowerCase() === user.name.trim().toLowerCase()
  );
  const birthDateLabel = formatDate(user.birthDate);

  useEffect(() => {
    const normalized = draft.city.trim();
    if (!editing || !citySuggestionsOpen || normalized.length < 2) {
      setRemoteCitySuggestions([]);
      setCitySearching(false);
      return;
    }

    let cancelled = false;
    setCitySearching(true);
    const timeout = setTimeout(() => {
      searchCitiesWorldwide(normalized)
        .then((suggestions) => {
          if (!cancelled) {
            setRemoteCitySuggestions(suggestions);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemoteCitySuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setCitySearching(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [citySuggestionsOpen, draft.city, editing]);

  const filteredCitySuggestions = useMemo(() => {
    const normalized = draft.city.trim().toLowerCase();
    if (normalized.length === 0) {
      return citySuggestions.slice(0, 5);
    }

    const localSuggestions = citySuggestions.filter((suggestion) =>
      `${suggestion.name} ${suggestion.province}`.toLowerCase().includes(normalized)
    );

    return [...remoteCitySuggestions, ...localSuggestions]
      .filter(
        (suggestion, index, all) =>
          all.findIndex(
            (item) =>
              item.name.toLowerCase() === suggestion.name.toLowerCase() &&
              item.province.toLowerCase() === suggestion.province.toLowerCase()
          ) === index
      )
      .slice(0, 6);
  }, [draft.city, remoteCitySuggestions]);

  const openEdit = () => {
    setDraft(user);
    setCitySuggestionsOpen(false);
    setRemoteCitySuggestions([]);
    setCitySearching(false);
    setFormError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(user);
    setCitySuggestionsOpen(false);
    setRemoteCitySuggestions([]);
    setCitySearching(false);
    setFormError("");
    setEditing(false);
  };

  const handleCityChange = (city: string) => {
    setDraft((current) => ({ ...current, city, cityCoordinates: undefined }));
    setCitySuggestionsOpen(true);
    setFormError("");
  };

  const chooseCity = (suggestion: CitySuggestion) => {
    setDraft((current) => ({
      ...current,
      city: suggestion.name,
      cityCoordinates: suggestion.coordinates
    }));
    setCitySuggestionsOpen(false);
    setFormError("");
  };

  const toggleInterest = (interest: Category) => {
    setDraft((current) => ({
      ...current,
      interests: current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest]
    }));
    setFormError("");
  };

  const toggleSection = (section: ProfileEventSectionKey) => {
    setExpandedSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const saveProfile = async () => {
    const normalizedName = draft.name.trim();
    const normalizedCity = draft.city.trim();
    const normalizedBio = draft.bio.trim();

    if (normalizedName.length < 2) {
      setFormError("Inserisci un nome di almeno 2 caratteri.");
      return;
    }
    if (normalizedCity.length < 2) {
      setFormError("Inserisci una citta valida.");
      return;
    }
    if (draft.interests.length < 3) {
      setFormError("Seleziona almeno 3 interessi.");
      return;
    }

    setSaving(true);
    const result = await onUpdateProfile({
      ...draft,
      name: normalizedName,
      city: normalizedCity,
      bio: normalizedBio
    });
    setSaving(false);

    if (!result.ok) {
      setFormError(result.message ?? "Non riesco ad aggiornare il profilo.");
      return;
    }

    setEditing(false);
    setFormError("");
  };

  if (editing) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.keyboard}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.container}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.editHeader}>
            <View>
              <Text style={styles.sectionTitle}>Modifica profilo</Text>
              <Text style={styles.editSubtitle}>Aggiorna le informazioni con cui Evnt personalizza feed e mappa.</Text>
            </View>
            <Pressable accessibilityLabel="Annulla modifica profilo" accessibilityRole="button" onPress={cancelEdit} style={styles.iconButton}>
              <Ionicons color={colors.muted} name="close" size={22} />
            </Pressable>
          </View>

          {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

          <View style={styles.editPanel}>
            <FormField label="Immagine profilo">
              <ProfileImagePicker
                onChange={(avatar) => setDraft((current) => ({ ...current, avatar }))}
                value={draft.avatar}
              />
            </FormField>

            <Field label="Nome *">
              <TextInput
                onChangeText={(name) => {
                  setDraft((current) => ({ ...current, name }));
                  setFormError("");
                }}
                placeholder="Il tuo nome"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={draft.name}
              />
            </Field>

            <Field label="Citta *">
              <View style={styles.autocompleteWrap}>
                <View style={styles.cityInputWrap}>
                  <TextInput
                    autoCapitalize="words"
                    autoCorrect={false}
                    onBlur={() => setTimeout(() => setCitySuggestionsOpen(false), 120)}
                    onChangeText={handleCityChange}
                    onFocus={() => setCitySuggestionsOpen(true)}
                    placeholder="La tua citta"
                    placeholderTextColor={colors.muted}
                    style={styles.cityInput}
                    value={draft.city}
                  />
                  <Ionicons color={draft.cityCoordinates ? colors.green : colors.muted} name="search-outline" size={19} />
                </View>

                {citySuggestionsOpen && filteredCitySuggestions.length > 0 && (
                  <View style={styles.suggestionList}>
                    {filteredCitySuggestions.map((suggestion, index) => (
                      <Pressable
                        accessibilityLabel={`Seleziona citta ${suggestion.name}, ${suggestion.province}`}
                        accessibilityRole="button"
                        key={citySuggestionKey(suggestion, index)}
                        onPress={() => chooseCity(suggestion)}
                        style={styles.suggestionRow}
                      >
                        <View style={styles.suggestionIcon}>
                          <Ionicons color={colors.ink} name="business-outline" size={17} />
                        </View>
                        <View style={styles.suggestionCopy}>
                          <Text style={styles.suggestionTitle}>{suggestion.name}</Text>
                          <Text style={styles.suggestionMeta}>{suggestion.province}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {citySuggestionsOpen && citySearching && filteredCitySuggestions.length === 0 && (
                  <View style={styles.suggestionList}>
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIcon}>
                        <Ionicons color={colors.ink} name="globe-outline" size={17} />
                      </View>
                      <View style={styles.suggestionCopy}>
                        <Text style={styles.suggestionTitle}>Cerco in tutto il mondo...</Text>
                        <Text style={styles.suggestionMeta}>OpenStreetMap</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </Field>

            <Field label="Bio">
              <TextInput
                multiline
                onChangeText={(bio) => setDraft((current) => ({ ...current, bio }))}
                placeholder="Racconta qualcosa di te..."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                value={draft.bio}
              />
            </Field>

            <FormField label="Interessi *">
              <View style={styles.chips}>
                {categories.map((category) => (
                  <CategoryChip
                    category={category}
                    key={category}
                    onPress={() => toggleInterest(category)}
                    selected={draft.interests.includes(category)}
                  />
                ))}
              </View>
            </FormField>
          </View>

          <View style={styles.editActions}>
            <Pressable accessibilityRole="button" onPress={cancelEdit} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Annulla</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={saveProfile} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{saving ? "Salvataggio..." : "Salva profilo"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel="Modifica profilo" accessibilityRole="button" onPress={openEdit} style={styles.iconButton}>
            <Ionicons color={colors.ink} name="create-outline" size={22} />
          </Pressable>
          <Pressable accessibilityLabel="Logout" accessibilityRole="button" onPress={onLogout} style={styles.iconButton}>
            <Ionicons color={colors.muted} name="log-out-outline" size={22} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.bio}>{user.bio}</Text>

      <View style={styles.chips}>
        {user.interests.map((interest) => (
          <CategoryChip category={interest} key={interest} selected />
        ))}
      </View>

      <View style={styles.infoPanel}>
        <ProfileInfo icon="location-outline" label="Citta base" value={user.city} />
        <ProfileInfo icon="calendar-outline" label="Nascita" value={birthDateLabel} />
        <ProfileInfo icon="sparkles-outline" label="Interessi" value={`${user.interests.length} attivi`} />
      </View>

      <View style={styles.eventSections}>
        {registeredEvents.length > 0 && (
          <ExpandableEventSection
            count={registeredEvents.length}
            expanded={expandedSections.registered}
            onToggle={() => toggleSection("registered")}
            title="Prossime iscrizioni"
          >
            {registeredEvents.map((event) => (
              <EventCard
                compact
                event={event}
                favorite={favorites.has(event.id)}
                key={event.id}
                onPress={() => onOpenEvent(event)}
                onToggleFavorite={() => onToggleFavorite(event.id)}
                registered
              />
            ))}
          </ExpandableEventSection>
        )}

        {favoriteEvents.length > 0 && (
          <ExpandableEventSection
            count={favoriteEvents.length}
            expanded={expandedSections.favorites}
            onToggle={() => toggleSection("favorites")}
            title="Preferiti"
          >
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
          </ExpandableEventSection>
        )}

        {createdEvents.length > 0 && (
          <ExpandableEventSection
            count={createdEvents.length}
            expanded={expandedSections.created}
            onToggle={() => toggleSection("created")}
            title="Creati"
          >
            {createdEvents.map((event) => (
              <EventCard
                compact
                event={event}
                favorite={favorites.has(event.id)}
                key={event.id}
                onPress={() => onOpenEvent(event)}
                onToggleFavorite={() => onToggleFavorite(event.id)}
                registered={registrations.has(event.id)}
              />
            ))}
          </ExpandableEventSection>
        )}
      </View>
    </ScrollView>
  );
}

type ExpandableEventSectionProps = {
  children: ReactNode;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  title: string;
};

function ExpandableEventSection({ children, count, expanded, onToggle, title }: ExpandableEventSectionProps) {
  return (
    <View style={styles.accordionCard}>
      <Pressable
        accessibilityLabel={`${expanded ? "Chiudi" : "Apri"} ${title}`}
        accessibilityRole="button"
        onPress={onToggle}
        style={styles.accordionHeader}
      >
        <View style={styles.accordionTitleWrap}>
          <Text style={styles.accordionTitle}>{title}</Text>
          <Text style={styles.accordionMeta}>{count}</Text>
        </View>
        <Ionicons color={colors.muted} name={expanded ? "chevron-up" : "chevron-down"} size={20} />
      </Pressable>
      {expanded ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

type ProfileInfoProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

function ProfileInfo({ icon, label, value }: ProfileInfoProps) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons color={colors.ink} name={icon} size={18} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

type FieldProps = {
  children: ReactNode;
  label: string;
};

function Field({ children, label }: FieldProps) {
  return (
    <FormField label={label}>
      {children}
    </FormField>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1
  },
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
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
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
  editHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  editSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: spacing.xs
  },
  formErrorText: {
    backgroundColor: colors.roseSoft,
    borderColor: "#F3B7B7",
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    padding: spacing.sm
  },
  editPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
    ...shadow
  },
  autocompleteWrap: {
    gap: spacing.sm
  },
  cityInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 16,
    minHeight: 50
  },
  cityInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  suggestionList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  suggestionRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  suggestionIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  suggestionCopy: {
    flex: 1
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  suggestionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  textArea: {
    minHeight: 116,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: spacing.lg
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  eventSections: {
    gap: spacing.md
  },
  infoPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadow
  },
  infoItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  infoCopy: {
    flex: 1
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
    marginTop: 2
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
  },
  accordionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  accordionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: spacing.md
  },
  accordionTitleWrap: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm
  },
  accordionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  accordionMeta: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    minWidth: 28,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textAlign: "center"
  },
  accordionBody: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  }
});

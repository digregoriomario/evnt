import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
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
import { EmptyState } from "../components/EmptyState";
import { EventCard } from "../components/EventCard";
import { ProfileImagePicker } from "../components/ProfileImagePicker";
import { categories } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, EvntEvent, UserProfile } from "../types";

type ProfileScreenProps = {
  createdCount: number;
  events: EvntEvent[];
  favorites: Set<string>;
  registrations: Set<string>;
  user: UserProfile;
  onLogout: () => void;
  onOpenEvent: (event: EvntEvent) => void;
  onToggleFavorite: (eventId: string) => void;
  onUpdateProfile: (profile: UserProfile) => Promise<{ ok: boolean; message?: string }>;
};

export function ProfileScreen({
  createdCount,
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
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const registeredEvents = events.filter((event) => registrations.has(event.id));
  const favoriteEvents = events.filter((event) => favorites.has(event.id));
  const birthDateLabel = formatDate(user.birthDate);

  const openEdit = () => {
    setDraft(user);
    setFormError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(user);
    setFormError("");
    setEditing(false);
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
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
            <ProfileImagePicker
              onChange={(avatar) => setDraft((current) => ({ ...current, avatar }))}
              value={draft.avatar}
            />

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
              <TextInput
                autoCapitalize="words"
                onChangeText={(city) => {
                  setDraft((current) => ({ ...current, city }));
                  setFormError("");
                }}
                placeholder="La tua citta"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={draft.city}
              />
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

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Interessi *</Text>
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
            </View>
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

      <View style={styles.stats}>
        <Stat value={String(registrations.size)} label="seguiti" />
        <Stat value={String(createdCount)} label="creati" />
        <Stat value={String(favorites.size)} label="preferiti" />
      </View>

      <View style={styles.infoPanel}>
        <ProfileInfo icon="location-outline" label="Citta base" value={user.city} />
        <ProfileInfo icon="calendar-outline" label="Nascita" value={birthDateLabel} />
        <ProfileInfo icon="sparkles-outline" label="Interessi" value={`${user.interests.length} attivi`} />
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
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  fieldGroup: {
    gap: spacing.sm
  },
  fieldLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
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
  stats: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: spacing.md,
    ...shadow
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
  }
});

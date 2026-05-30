import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { categoryColors, categorySoftColors } from "../data/events";
import { placeSuggestions, type PlaceSuggestion } from "../data/places";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, ChatMode, EvntEvent, UserProfile } from "../types";

type CreateEventScreenProps = {
  user: UserProfile;
  onCreate: (event: EvntEvent) => void;
};

type EventTypeOption = {
  emoji: string;
  label: string;
  category: Category;
};

const eventTypes: EventTypeOption[] = [
  { emoji: "🌙", label: "Serate", category: "Serata" },
  { emoji: "⚽", label: "Calcetto", category: "Sport" },
  { emoji: "🎸", label: "Concerti", category: "Concerto" },
  { emoji: "🏃", label: "Sport", category: "Sport" },
  { emoji: "🤝", label: "Social", category: "Social" },
  { emoji: "📅", label: "Altro", category: "Arte" }
];

const defaultImage =
  "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80";

const createPrimary = "#5A4BC4";
const createPrimarySoft = "#F0EEFF";

export function CreateEventScreen({ user, onCreate }: CreateEventScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState(eventTypes[1]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("Gruppo aperto");

  const parsedPrice = useMemo(() => Number.parseFloat(price.replace(",", ".")), [price]);
  const parsedCapacity = useMemo(() => Number.parseInt(capacity, 10), [capacity]);
  const isFree = !Number.isFinite(parsedPrice) || parsedPrice <= 0;
  const capacityLabel = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? String(parsedCapacity) : "Illimitati";
  const priceLabel = isFree ? "Gratis" : `EUR ${parsedPrice}`;
  const selectedAccent = categoryColors[selectedType.category];
  const selectedSoft = categorySoftColors[selectedType.category];

  const filteredPlaceSuggestions = useMemo(() => {
    const normalized = place.trim().toLowerCase();
    if (normalized.length < 2) {
      return [];
    }

    return placeSuggestions
      .filter((item) => {
        const searchable = `${item.name} ${item.address} ${item.city}`.toLowerCase();
        return searchable.includes(normalized);
      })
      .slice(0, 5);
  }, [place]);

  const canGoNext =
    step === 0
      ? title.trim().length > 2
      : step === 1
        ? place.trim().length > 1 && date.trim().length > 0 && time.trim().length > 0
        : true;

  const resetForm = () => {
    setStep(0);
    setSelectedType(eventTypes[1]);
    setTitle("");
    setDescription("");
    setPlace("");
    setAddress("");
    setSelectedPlace(null);
    setPlaceSuggestionsOpen(false);
    setDate("");
    setTime("");
    setCapacity("");
    setPrice("");
    setChatMode("Gruppo aperto");
  };

  const publish = () => {
    onCreate({
      id: `created-${Date.now()}`,
      title: title.trim(),
      category: selectedType.category,
      date: date.trim(),
      time: time.trim(),
      place: place.trim(),
      city: selectedPlace?.city ?? user.city,
      address: address.trim() || selectedPlace?.address || `${place.trim()}, ${user.city}`,
      price: isFree ? 0 : parsedPrice,
      distanceKm: selectedPlace?.distanceKm ?? 0.9,
      affinity: 100,
      popularity: 10,
      participants: 1,
      capacity: Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? parsedCapacity : null,
      image: defaultImage,
      description: description.trim() || `${selectedType.label} creato da ${user.name}.`,
      organizer: user.name,
      chatMode,
      tags: [selectedType.label.toLowerCase(), (selectedPlace?.city ?? user.city).toLowerCase(), "nuovo"],
      coordinates: selectedPlace?.coordinates ?? { latitude: 40.6782, longitude: 14.7589 }
    });

    resetForm();
  };

  const goBack = () => {
    if (step === 0) {
      resetForm();
      return;
    }
    setStep((current) => current - 1);
  };

  const goNext = () => {
    if (!canGoNext) return;
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    publish();
  };

  const handlePlaceChange = (value: string) => {
    setPlace(value);
    setSelectedPlace(null);
    setPlaceSuggestionsOpen(value.trim().length > 1);
  };

  const choosePlace = (suggestion: PlaceSuggestion) => {
    setPlace(suggestion.name);
    setAddress(suggestion.address);
    setSelectedPlace(suggestion);
    setPlaceSuggestionsOpen(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Indietro" onPress={goBack} style={styles.backButton}>
          <Ionicons color={colors.ink} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuovo evento • {step + 1}/3</Text>
        <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Annulla</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>TIPO DI EVENTO</Text>
            <View style={styles.typeGrid}>
              {eventTypes.map((item) => {
                const selected = selectedType.label === item.label;
                const accent = categoryColors[item.category];
                const soft = categorySoftColors[item.category];
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => setSelectedType(item)}
                    style={[
                      styles.typeChip,
                      { backgroundColor: soft, borderColor: selected ? accent : soft },
                      selected && styles.typeChipActive
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{item.emoji}</Text>
                    <Text style={[styles.typeText, { color: accent }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Field label="Titolo *">
              <TextInput
                onChangeText={setTitle}
                placeholder="Es. Calcetto 5v5 - cercasi 3"
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={title}
              />
            </Field>

            <Field label="Descrizione">
              <TextInput
                multiline
                onChangeText={setDescription}
                placeholder="Di cosa si tratta..."
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.textArea]}
                value={description}
              />
            </Field>
          </View>
        )}

        {step === 1 && (
          <View style={styles.panel}>
            <Field label="Luogo *">
              <View style={styles.autocompleteWrap}>
                <View style={styles.placeInputWrap}>
                  <TextInput
                    autoCorrect={false}
                    onBlur={() => setTimeout(() => setPlaceSuggestionsOpen(false), 120)}
                    onChangeText={handlePlaceChange}
                    onFocus={() => setPlaceSuggestionsOpen(place.trim().length > 1)}
                    placeholder="Es. Campi Marassi, Genova"
                    placeholderTextColor={colors.muted}
                    style={styles.placeInput}
                    value={place}
                  />
                  <Ionicons color={selectedPlace ? colors.green : colors.muted} name="search-outline" size={20} />
                </View>

                {placeSuggestionsOpen && filteredPlaceSuggestions.length > 0 && (
                  <View style={styles.suggestionList}>
                    {filteredPlaceSuggestions.map((suggestion) => (
                      <Pressable
                        key={`${suggestion.name}-${suggestion.address}`}
                        onPress={() => choosePlace(suggestion)}
                        style={styles.suggestionRow}
                      >
                        <View style={styles.suggestionIcon}>
                          <Ionicons color={colors.ink} name="location-outline" size={18} />
                        </View>
                        <View style={styles.suggestionCopy}>
                          <Text style={styles.suggestionTitle}>{suggestion.name}</Text>
                          <Text numberOfLines={1} style={styles.suggestionMeta}>
                            {suggestion.address}
                          </Text>
                        </View>
                        <Text style={styles.suggestionDistance}>{suggestion.distanceKm.toFixed(1)} km</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </Field>

            <Field label="Indirizzo">
              <TextInput
                onChangeText={setAddress}
                placeholder="Via, civico, citta..."
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={address}
              />
            </Field>

            <View style={styles.inlineFields}>
              <Field compact label="Data *">
                <View style={styles.iconInput}>
                  <TextInput
                    onChangeText={setDate}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor={colors.muted}
                    style={styles.inlineInput}
                    value={date}
                  />
                  <Ionicons color={colors.ink} name="calendar-outline" size={20} />
                </View>
              </Field>
              <Field compact label="Orario *">
                <View style={styles.iconInput}>
                  <TextInput
                    onChangeText={setTime}
                    placeholder="--:--"
                    placeholderTextColor={colors.muted}
                    style={styles.inlineInput}
                    value={time}
                  />
                  <Ionicons color={colors.ink} name="time-outline" size={20} />
                </View>
              </Field>
            </View>

            <View style={styles.inlineFields}>
              <Field compact label="Posti max">
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={setCapacity}
                  placeholder="Illimitati"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={capacity}
                />
              </Field>
              <Field compact label="Costo (EUR)">
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={setPrice}
                  placeholder="0 = gratis"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={price}
                />
              </Field>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Tipo chat</Text>
              <ChatChoice
                active={chatMode === "Gruppo aperto"}
                icon="💬"
                subtitle="Tutti possono scrivere"
                title="Chat di gruppo"
                onPress={() => setChatMode("Gruppo aperto")}
              />
              <ChatChoice
                active={chatMode === "Solo annunci"}
                icon="📣"
                subtitle="Solo tu scrivi"
                title="Solo annunci"
                onPress={() => setChatMode("Solo annunci")}
              />
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.reviewStack}>
            <View style={[styles.previewCard, { backgroundColor: selectedSoft }]}>
              <Text style={styles.previewEmoji}>{selectedType.emoji}</Text>
              <View style={[styles.previewBadge, { borderColor: selectedAccent }]}>
                <Text style={[styles.previewBadgeText, { color: selectedAccent }]}>{selectedType.label}</Text>
              </View>
              <Text style={styles.previewTitle}>{title || "Titolo evento"}</Text>
              <Text style={styles.previewMeta}>
                {place || "Luogo"} · {priceLabel}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <SummaryRow label="Categoria" value={`${selectedType.label} ${selectedType.emoji}`} />
              <SummaryRow label="Data" value={date || "-"} />
              <SummaryRow label="Orario" value={time || "-"} />
              <SummaryRow label="Luogo" value={place || "-"} />
              <SummaryRow label="Posti" value={capacityLabel} />
              <SummaryRow label="Costo" value={priceLabel} />
              <SummaryRow label="Chat" value={chatMode === "Gruppo aperto" ? "Gruppo" : "Annunci"} last />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomAction}>
        <Pressable
          disabled={!canGoNext}
          onPress={goNext}
          style={[styles.primaryButton, !canGoNext && styles.disabledPrimary]}
        >
          <Text style={styles.primaryText}>{step === 2 ? "✓ Pubblica evento" : "Avanti →"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

type FieldProps = {
  children: ReactNode;
  compact?: boolean;
  label: string;
};

function Field({ children, compact = false, label }: FieldProps) {
  return (
    <View style={[styles.fieldGroup, compact && styles.inlineField]}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

type ChatChoiceProps = {
  active: boolean;
  icon: string;
  onPress: () => void;
  subtitle: string;
  title: string;
};

function ChatChoice({ active, icon, onPress, subtitle, title }: ChatChoiceProps) {
  return (
    <Pressable onPress={onPress} style={[styles.chatChoice, active && styles.chatChoiceActive]}>
      <View style={[styles.chatAccent, active && styles.chatAccentActive]} />
      <View style={styles.chatCopy}>
        <Text style={styles.chatTitle}>
          {icon} {title}
        </Text>
        <Text style={styles.chatSubtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

type SummaryRowProps = {
  label: string;
  last?: boolean;
  value: string;
};

function SummaryRow({ label, last = false, value }: SummaryRowProps) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  topBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  headerTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 20,
    fontWeight: "900"
  },
  cancelButton: {
    paddingVertical: spacing.sm
  },
  cancelText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700"
  },
  container: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 112
  },
  progressRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  progressDot: {
    backgroundColor: colors.line,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  progressDotActive: {
    backgroundColor: createPrimary,
    width: 36
  },
  panel: {
    gap: spacing.lg
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  typeChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    ...shadow
  },
  typeChipActive: {
    borderWidth: 1
  },
  typeEmoji: {
    fontSize: 16
  },
  typeText: {
    fontSize: 16,
    fontWeight: "900"
  },
  fieldGroup: {
    gap: spacing.sm
  },
  inlineFields: {
    flexDirection: "row",
    gap: spacing.lg
  },
  inlineField: {
    flex: 1
  },
  label: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: "#D8D3CC",
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 18,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    ...shadow
  },
  autocompleteWrap: {
    gap: spacing.sm
  },
  placeInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D8D3CC",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    ...shadow
  },
  placeInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 18,
    minHeight: 58
  },
  suggestionList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    ...shadow
  },
  suggestionRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  suggestionIcon: {
    alignItems: "center",
    backgroundColor: "#EEF5FF",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40
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
    marginTop: 3
  },
  suggestionDistance: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 150,
    paddingTop: spacing.lg,
    textAlignVertical: "top"
  },
  iconInput: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#D8D3CC",
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    ...shadow
  },
  inlineInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 18,
    minHeight: 58
  },
  chatChoice: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 96,
    padding: spacing.lg
  },
  chatChoiceActive: {
    backgroundColor: createPrimarySoft,
    borderColor: createPrimary
  },
  chatAccent: {
    backgroundColor: colors.line,
    borderRadius: 7,
    width: 6
  },
  chatAccentActive: {
    backgroundColor: createPrimary
  },
  chatCopy: {
    flex: 1,
    justifyContent: "center"
  },
  chatTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  chatSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4
  },
  reviewStack: {
    gap: spacing.xl
  },
  previewCard: {
    alignItems: "center",
    borderRadius: 22,
    gap: spacing.sm,
    padding: spacing.xxl
  },
  previewEmoji: {
    fontSize: 52
  },
  previewBadge: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4
  },
  previewBadgeText: {
    fontSize: 15,
    fontWeight: "900"
  },
  previewTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  summaryCard: {
    backgroundColor: "#FAFAF8",
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg
  },
  summaryRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58
  },
  summaryRowLast: {
    borderBottomWidth: 0
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 18,
    fontWeight: "700"
  },
  summaryValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "right"
  },
  bottomAction: {
    backgroundColor: colors.background,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    left: 0,
    padding: spacing.lg,
    position: "absolute",
    right: 0
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: createPrimary,
    borderRadius: radius.md,
    justifyContent: "center",
    minHeight: 62,
    ...shadow
  },
  disabledPrimary: {
    backgroundColor: "#B9B2A7"
  },
  primaryText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900"
  }
});

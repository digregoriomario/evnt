import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { distanceBetweenKm, searchPlacesWorldwide } from "../api/geocoding";
import { DateTimePickerField } from "../components/DateTimePickerField";
import { PillButton } from "../components/PillButton";
import { findCitySuggestion } from "../data/cities";
import { categoryColors, categoryDefaultImages, categorySoftColors, eventSubcategories } from "../data/events";
import { placeSuggestions, type PlaceSuggestion } from "../data/places";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, ChatMode, EvntEvent, UserProfile } from "../types";

type CreateEventScreenProps = {
  user: UserProfile;
  onCreate: (event: EvntEvent) => void;
};

type CreateField = "address" | "capacity" | "date" | "description" | "place" | "price" | "time" | "title";
type CreateFieldErrors = Partial<Record<CreateField, string>>;

type EventTypeOption = {
  emoji: string;
  label: string;
  category: Category;
};

const eventTypes: EventTypeOption[] = [
  { emoji: "🌙", label: "Serate", category: "Serata" },
  { emoji: "⚽", label: "Sport", category: "Sport" },
  { emoji: "🎸", label: "Concerti", category: "Concerto" },
  { emoji: "🍔", label: "Food", category: "Food" },
  { emoji: "🤝", label: "Social", category: "Social" },
  { emoji: "🎨", label: "Arte", category: "Arte" },
  { emoji: "💻", label: "Tech", category: "Tech" }
];

const createPrimary = "#5A4BC4";
const createPrimarySoft = "#F0EEFF";
const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const monthNames = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const maxTitleLength = 90;
const maxDescriptionLength = 500;
const maxAddressLength = 180;
const maxCapacity = 10000;
const maxPrice = 10000;

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function getDefaultEventDateTime() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(19, 0, 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return {
    date: toIsoDate(target),
    time: toTimeValue(target)
  };
}

function localEventDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time || "00:00"}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatEventDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return isToday ? "Oggi" : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function hasCreateErrors(errors: CreateFieldErrors) {
  return Object.keys(errors).length > 0;
}

export function CreateEventScreen({ user, onCreate }: CreateEventScreenProps) {
  const [defaultDateTime] = useState(() => getDefaultEventDateTime());
  const [step, setStep] = useState(0);
  const [selectedType, setSelectedType] = useState(eventTypes[1]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(eventSubcategories[eventTypes[1].category][0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [remotePlaceSuggestions, setRemotePlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [date, setDate] = useState(defaultDateTime.date);
  const [time, setTime] = useState(defaultDateTime.time);
  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [chatMode, setChatMode] = useState<ChatMode>("Gruppo aperto");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CreateFieldErrors>({});

  const parsedPrice = useMemo(() => Number.parseFloat(price.replace(",", ".")), [price]);
  const parsedCapacity = useMemo(() => Number.parseInt(capacity, 10), [capacity]);
  const isFree = !Number.isFinite(parsedPrice) || parsedPrice <= 0;
  const capacityLabel = Number.isFinite(parsedCapacity) && parsedCapacity > 0 ? String(parsedCapacity) : "Illimitati";
  const priceLabel = isFree ? "Gratis" : `EUR ${parsedPrice}`;
  const selectedAccent = categoryColors[selectedType.category];
  const selectedSoft = categorySoftColors[selectedType.category];
  const selectedSubcategories = eventSubcategories[selectedType.category];
  const minimumEventDate = useMemo(() => new Date(), []);
  const eventDateTime = useMemo(() => localEventDateTime(date, time), [date, time]);
  const eventIsInPast = eventDateTime ? eventDateTime.getTime() < Date.now() : true;
  const originCoordinates = user.cityCoordinates ?? findCitySuggestion(user.city)?.coordinates;

  useEffect(() => {
    if (!selectedSubcategories.includes(selectedSubcategory)) {
      setSelectedSubcategory(selectedSubcategories[0]);
    }
  }, [selectedSubcategories, selectedSubcategory]);

  useEffect(() => {
    const normalized = place.trim();
    if (!placeSuggestionsOpen || normalized.length < 2) {
      setRemotePlaceSuggestions([]);
      setPlaceSearching(false);
      return;
    }

    let cancelled = false;
    setPlaceSearching(true);
    const timeout = setTimeout(() => {
      searchPlacesWorldwide(normalized, originCoordinates)
        .then((suggestions) => {
          if (!cancelled) {
            setRemotePlaceSuggestions(suggestions);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setRemotePlaceSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setPlaceSearching(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [originCoordinates, place, placeSuggestionsOpen]);

  const filteredPlaceSuggestions = useMemo(() => {
    const normalized = place.trim().toLowerCase();
    if (normalized.length < 2) {
      return [];
    }

    const localSuggestions = placeSuggestions
      .filter((item) => {
        const searchable = `${item.name} ${item.address} ${item.city}`.toLowerCase();
        return searchable.includes(normalized);
      })
      .map((suggestion) => ({
        ...suggestion,
        distanceKm: originCoordinates
          ? distanceBetweenKm(originCoordinates, suggestion.coordinates)
          : suggestion.distanceKm
      }));

    return [...remotePlaceSuggestions, ...localSuggestions]
      .filter(
        (suggestion, index, all) =>
          all.findIndex(
            (item) =>
              item.name.toLowerCase() === suggestion.name.toLowerCase() &&
              item.address.toLowerCase() === suggestion.address.toLowerCase()
          ) === index
      )
      .slice(0, 6);
  }, [originCoordinates, place, remotePlaceSuggestions]);

  const clearFieldError = (field: CreateField) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError("");
  };

  const validateStep = (targetStep: number) => {
    const errors: CreateFieldErrors = {};

    if (targetStep === 0) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 3) {
        errors.title = "Inserisci un titolo di almeno 3 caratteri.";
      } else if (trimmedTitle.length > maxTitleLength) {
        errors.title = `Il titolo puo contenere al massimo ${maxTitleLength} caratteri.`;
      }
      if (description.length > maxDescriptionLength) {
        errors.description = `La descrizione puo contenere al massimo ${maxDescriptionLength} caratteri.`;
      }
    }

    if (targetStep === 1) {
      const normalizedCapacity = capacity.trim();
      const normalizedPrice = price.trim();
      if (place.trim().length < 2) {
        errors.place = "Inserisci il luogo dell'evento.";
      }
      if (address.length > maxAddressLength) {
        errors.address = `L'indirizzo puo contenere al massimo ${maxAddressLength} caratteri.`;
      }
      if (!date) {
        errors.date = "Seleziona una data.";
      }
      if (!time) {
        errors.time = "Seleziona un orario.";
      }
      if (date && time && eventIsInPast) {
        errors.time = "Data e orario non possono essere antecedenti a ora.";
      }
      if (normalizedCapacity && !/^\d+$/.test(normalizedCapacity)) {
        errors.capacity = "Inserisci un numero intero oppure lascia vuoto.";
      } else if (normalizedCapacity && Number.isFinite(parsedCapacity) && parsedCapacity <= 0) {
        errors.capacity = "Lascia vuoto per posti illimitati oppure inserisci un numero maggiore di 0.";
      } else if (Number.isFinite(parsedCapacity) && parsedCapacity > maxCapacity) {
        errors.capacity = `Massimo ${maxCapacity} posti.`;
      }
      if (normalizedPrice && !/^\d+([,.]\d{1,2})?$/.test(normalizedPrice)) {
        errors.price = "Inserisci un costo valido, es. 8 oppure 8,50.";
      } else if (Number.isFinite(parsedPrice) && parsedPrice > maxPrice) {
        errors.price = `Costo massimo EUR ${maxPrice}.`;
      }
    }

    return errors;
  };

  const validateBeforePublish = () => {
    const errors = {
      ...validateStep(0),
      ...validateStep(1)
    };
    return errors;
  };

  const showCreateErrors = (errors: CreateFieldErrors) => {
    setFieldErrors(errors);
    setFormError("Controlla i campi evidenziati prima di continuare.");
  };

  const resetForm = () => {
    const nextDefault = getDefaultEventDateTime();
    setStep(0);
    setSelectedType(eventTypes[1]);
    setSelectedSubcategory(eventSubcategories[eventTypes[1].category][0]);
    setTitle("");
    setDescription("");
    setPlace("");
    setAddress("");
    setSelectedPlace(null);
    setPlaceSuggestionsOpen(false);
    setDate(nextDefault.date);
    setTime(nextDefault.time);
    setCapacity("");
    setPrice("");
    setChatMode("Gruppo aperto");
    setFormError("");
    setFieldErrors({});
  };

  const publish = () => {
    const dateTime = eventDateTime ?? new Date();
    onCreate({
      id: `created-${Date.now()}`,
      title: title.trim(),
      category: selectedType.category,
      date: formatEventDateLabel(date),
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
      image: categoryDefaultImages[selectedType.category],
      description: description.trim() || `${selectedSubcategory} creato da ${user.name}.`,
      organizer: user.name,
      chatMode,
      tags: [
        selectedType.label.toLowerCase(),
        selectedSubcategory.toLowerCase(),
        (selectedPlace?.city ?? user.city).toLowerCase(),
        "nuovo"
      ],
      coordinates: selectedPlace?.coordinates ?? { latitude: 40.6782, longitude: 14.7589 },
      dateTimeIso: dateTime.toISOString(),
      subcategory: selectedSubcategory
    });

    resetForm();
  };

  const goBack = () => {
    setFormError("");
    setFieldErrors({});
    if (step === 0) {
      resetForm();
      return;
    }
    setStep((current) => current - 1);
  };

  const goNext = () => {
    const errors = step === 2 ? validateBeforePublish() : validateStep(step);
    if (hasCreateErrors(errors)) {
      showCreateErrors(errors);
      if (step === 2) {
        setStep(errors.title || errors.description ? 0 : 1);
      }
      return;
    }

    setFormError("");
    setFieldErrors({});
    if (step < 2) {
      setStep((current) => current + 1);
      return;
    }
    publish();
  };

  const handlePlaceChange = (value: string) => {
    setPlace(value);
    clearFieldError("place");
    setSelectedPlace(null);
    setPlaceSuggestionsOpen(value.trim().length > 1);
  };

  const choosePlace = (suggestion: PlaceSuggestion) => {
    setPlace(suggestion.name);
    setAddress(suggestion.address);
    setSelectedPlace(suggestion);
    clearFieldError("place");
    clearFieldError("address");
    setPlaceSuggestionsOpen(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Indietro" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Ionicons color={colors.ink} name="arrow-back" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Nuovo evento • {step + 1}/3</Text>
        <Pressable
          accessibilityLabel="Annulla creazione evento"
          accessibilityRole="button"
          onPress={resetForm}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Annulla</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.progressRow}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.progressDot, item <= step && styles.progressDotActive]} />
          ))}
        </View>
        {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

        {step === 0 && (
          <View style={styles.panel}>
            <Text style={styles.sectionLabel}>TIPO DI EVENTO</Text>
            <View style={styles.typeGrid}>
              {eventTypes.map((item) => {
                const selected = selectedType.label === item.label;
                const accent = categoryColors[item.category];
                const soft = categorySoftColors[item.category];
                return (
                  <PillButton
                    accent={accent}
                    accessibilityLabel={`Seleziona tipo evento ${item.label}`}
                    emoji={item.emoji}
                    key={item.label}
                    label={item.label}
                    onPress={() => {
                      setSelectedType(item);
                      setSelectedSubcategory(eventSubcategories[item.category][0]);
                    }}
                    selected={selected}
                    soft={soft}
                  />
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>SOTTOCATEGORIA</Text>
            <View style={styles.subcategoryGrid}>
              {selectedSubcategories.map((item) => {
                const selected = item === selectedSubcategory;
                return (
                  <PillButton
                    accent={selected ? createPrimary : colors.ink}
                    accessibilityLabel={`Seleziona sottocategoria ${item}`}
                    key={item}
                    label={item}
                    onPress={() => setSelectedSubcategory(item)}
                    selected={selected}
                    soft={selected ? createPrimarySoft : colors.surfaceMuted}
                  />
                );
              })}
            </View>

            <Field error={fieldErrors.title} label="Titolo *">
              <TextInput
                onChangeText={(value) => {
                  setTitle(value);
                  clearFieldError("title");
                }}
                placeholder={`Es. ${selectedSubcategory} - cercasi 3`}
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={title}
              />
            </Field>

            <Field error={fieldErrors.description} label="Descrizione">
              <TextInput
                multiline
                onChangeText={(value) => {
                  setDescription(value);
                  clearFieldError("description");
                }}
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
            <Field error={fieldErrors.place} label="Luogo *">
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
                        accessibilityLabel={`Seleziona luogo ${suggestion.name}, ${suggestion.address}`}
                        accessibilityRole="button"
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

                {placeSuggestionsOpen && placeSearching && filteredPlaceSuggestions.length === 0 && (
                  <View style={styles.suggestionList}>
                    <View style={styles.suggestionRow}>
                      <View style={styles.suggestionIcon}>
                        <Ionicons color={colors.ink} name="globe-outline" size={18} />
                      </View>
                      <View style={styles.suggestionCopy}>
                        <Text style={styles.suggestionTitle}>Cerco luoghi in tutto il mondo...</Text>
                        <Text style={styles.suggestionMeta}>OpenStreetMap</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </Field>

            <Field error={fieldErrors.address} label="Indirizzo">
              <TextInput
                onChangeText={(value) => {
                  setAddress(value);
                  clearFieldError("address");
                }}
                placeholder="Via, civico, citta..."
                placeholderTextColor={colors.muted}
                style={styles.input}
                value={address}
              />
            </Field>

            <View style={styles.inlineFields}>
              <Field compact error={fieldErrors.date} label="Data *">
                <DateTimePickerField
                  minimumDate={minimumEventDate}
                  mode="date"
                  onChange={(value) => {
                    setDate(value);
                    clearFieldError("date");
                    clearFieldError("time");
                  }}
                  placeholder="Seleziona"
                  value={date}
                />
              </Field>
              <Field compact error={fieldErrors.time} label="Orario *">
                <DateTimePickerField
                  mode="time"
                  onChange={(value) => {
                    setTime(value);
                    clearFieldError("time");
                  }}
                  placeholder="--:--"
                  value={time}
                />
              </Field>
            </View>
            {eventIsInPast && (
              <Text style={styles.warningText}>Scegli una data e un orario non antecedenti a oggi.</Text>
            )}

            <View style={styles.inlineFields}>
              <Field compact error={fieldErrors.capacity} label="Posti max">
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setCapacity(value);
                    clearFieldError("capacity");
                  }}
                  placeholder="Illimitati"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  value={capacity}
                />
              </Field>
              <Field compact error={fieldErrors.price} label="Costo (EUR)">
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setPrice(value);
                    clearFieldError("price");
                  }}
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
              <PillButton accent={selectedAccent} label={selectedSubcategory} soft={colors.surface} />
              <Text style={styles.previewTitle}>{title || "Titolo evento"}</Text>
              <Text style={styles.previewMeta}>
                {place || "Luogo"} · {priceLabel}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <SummaryRow label="Tipo evento" value={`${selectedSubcategory} ${selectedType.emoji}`} />
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
          accessibilityLabel={step === 2 ? "Pubblica evento" : "Vai al passaggio successivo"}
          accessibilityRole="button"
          onPress={goNext}
          style={styles.primaryButton}
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
  error?: string;
  label: string;
};

function Field({ children, compact = false, error, label }: FieldProps) {
  return (
    <View style={[styles.fieldGroup, compact && styles.inlineField]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
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
    <Pressable
      accessibilityLabel={`Seleziona ${title}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chatChoice, active && styles.chatChoiceActive]}
    >
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
  subcategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: -spacing.sm
  },
  fieldGroup: {
    gap: spacing.sm
  },
  fieldErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
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
  warningText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    marginTop: -spacing.sm
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

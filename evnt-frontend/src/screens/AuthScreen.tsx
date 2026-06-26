import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";

import { CategoryChip } from "../components/CategoryChip";
import { DateTimePickerField } from "../components/DateTimePickerField";
import { FormField } from "../components/FormField";
import { ProfileImagePicker } from "../components/ProfileImagePicker";
import { api, ApiError } from "../api";
import { reverseGeocodeCityWorldwide, searchCitiesWorldwide } from "../api/geocoding";
import { requestCurrentCoordinates } from "../application/location/currentPosition";
import { citySuggestions, type CitySuggestion } from "../data/cities";
import { categories } from "../data/events";
import { colors, form, radius, shadow, spacing } from "../theme";
import { Category, UserProfile } from "../types";

export type AuthCredentials = { mode: "login" | "signup"; password: string };
export type AuthResult = { ok: boolean; message?: string };

type AuthScreenProps = {
  onComplete: (profile: UserProfile, credentials?: AuthCredentials) => Promise<AuthResult>;
};

type AuthField =
  | "avatar"
  | "bio"
  | "birthDate"
  | "city"
  | "confirmPassword"
  | "email"
  | "interests"
  | "name"
  | "password";

type AuthFieldErrors = Partial<Record<AuthField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const minimumAge = 16;
const maxProfileImageMb = 5;
const maxBioLength = 240;

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return emailPattern.test(normalizedEmail(value));
}

function ageFromDate(value: string) {
  const birth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function imageSizeMb(value: string) {
  const base64 = value.startsWith("data:image/") ? value.split(",")[1] : "";
  return base64 ? (base64.length * 3) / 4 / (1024 * 1024) : 0;
}

function hasErrors(errors: AuthFieldErrors) {
  return Object.keys(errors).length > 0;
}

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

function findMatchingCitySuggestion(city: string, suggestions: CitySuggestion[]) {
  const normalized = city.trim().toLowerCase();
  return suggestions.find((suggestion) => suggestion.name.trim().toLowerCase() === normalized);
}

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const { height } = useWindowDimensions();
  const isCompactHeight = height < 760;
  const [authView, setAuthView] = useState<"welcome" | "form">("welcome");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [selectedCity, setSelectedCity] = useState<CitySuggestion | null>(null);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [remoteCitySuggestions, setRemoteCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [cityLocating, setCityLocating] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<Category[]>([]);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const today = useMemo(() => new Date(), []);

  const stepTitle = ["Crea il tuo account", "Parlaci di te", "Completa il tuo profilo"][step];
  const progress = `${step + 1}/3`;

  const helperText = useMemo(() => {
    if (mode === "signup" && step === 2) {
      return `Almeno 3 interessi (${interests.length}/3).`;
    }
    return "";
  }, [interests.length, mode, step]);

  useEffect(() => {
    const normalized = city.trim();
    if (!citySuggestionsOpen || normalized.length < 2) {
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
  }, [city, citySuggestionsOpen]);

  const filteredCitySuggestions = useMemo(() => {
    const normalized = city.trim().toLowerCase();
    if (normalized.length === 0) {
      return citySuggestions.slice(0, 8);
    }

    const localSuggestions = citySuggestions
      .filter((suggestion) =>
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
      .slice(0, 4);
  }, [city, remoteCitySuggestions]);

  const toggleInterest = (category: Category) => {
    clearFieldError("interests");
    setInterests((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearFieldError = (field: AuthField) => {
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

  const handleCityChange = (value: string) => {
    clearFieldError("city");
    setCity(value);
    setSelectedCity(null);
    setCitySuggestionsOpen(true);
  };

  const chooseCity = (suggestion: CitySuggestion) => {
    setCity(suggestion.name);
    setSelectedCity(suggestion);
    clearFieldError("city");
    setCitySuggestionsOpen(false);
  };

  async function useCurrentCity() {
    if (cityLocating) {
      return;
    }

    setCityLocating(true);
    const coordinates = await requestCurrentCoordinates();
    if (!coordinates) {
      setFieldErrors((current) => ({ ...current, city: "Non riesco a recuperare la citta attuale." }));
      setFormError("Attiva la geolocalizzazione oppure seleziona la citta dai suggerimenti.");
      setCityLocating(false);
      return;
    }

    const currentCity = await reverseGeocodeCityWorldwide(coordinates).catch(() => null);
    if (!currentCity) {
      setFieldErrors((current) => ({ ...current, city: "Non riesco a leggere la citta da questa posizione." }));
      setFormError("Seleziona la citta manualmente dai suggerimenti.");
      setCityLocating(false);
      return;
    }

    setCity(currentCity.name);
    setSelectedCity(currentCity);
    setRemoteCitySuggestions([]);
    setCitySuggestionsOpen(false);
    clearFieldError("city");
    setCityLocating(false);
  }

  const resolveCity = async () => {
    const normalized = city.trim();
    const selectedMatch =
      selectedCity && selectedCity.name.trim().toLowerCase() === normalized.toLowerCase()
        ? selectedCity
        : undefined;
    if (selectedMatch) {
      return selectedMatch;
    }

    const visibleMatch = findMatchingCitySuggestion(normalized, filteredCitySuggestions);
    if (visibleMatch) {
      return visibleMatch;
    }

    const remoteSuggestions = await searchCitiesWorldwide(normalized).catch(() => []);
    return findMatchingCitySuggestion(normalized, remoteSuggestions) ?? null;
  };

  const validateLogin = () => {
    const errors: AuthFieldErrors = {};
    if (!isValidEmail(email)) {
      errors.email = "Inserisci un'email valida.";
    }
    if (!password) {
      errors.password = "Inserisci la password.";
    }
    return errors;
  };

  const validateSignupStep = (targetStep: number) => {
    const errors: AuthFieldErrors = {};
    if (targetStep === 0) {
      if (!isValidEmail(email)) {
        errors.email = "Inserisci un'email valida.";
      }
      if (password.length < 6) {
        errors.password = "La password deve avere almeno 6 caratteri.";
      }
      if (!confirmPassword) {
        errors.confirmPassword = "Conferma la password.";
      } else if (password !== confirmPassword) {
        errors.confirmPassword = "Le password non coincidono.";
      }
    }

    if (targetStep === 1) {
      const age = ageFromDate(birthDate);
      if (name.trim().length < 2) {
        errors.name = "Inserisci almeno 2 caratteri.";
      }
      if (!birthDate) {
        errors.birthDate = "Seleziona la data di nascita.";
      } else if (age === null) {
        errors.birthDate = "Data di nascita non valida.";
      } else if (age < minimumAge) {
        errors.birthDate = `Devi avere almeno ${minimumAge} anni.`;
      }
      if (city.trim().length < 2) {
        errors.city = "La citta e obbligatoria.";
      }
    }

    if (targetStep === 2) {
      const imageMb = imageSizeMb(avatar);
      if (imageMb > maxProfileImageMb) {
        errors.avatar = `L'immagine supera ${maxProfileImageMb} MB. Scegli una foto piu leggera.`;
      }
      if (bio.length > maxBioLength) {
        errors.bio = `La bio puo contenere al massimo ${maxBioLength} caratteri.`;
      }
      if (interests.length < 3) {
        errors.interests = "Seleziona almeno 3 interessi.";
      }
    }

    return errors;
  };

  const showValidationErrors = (errors: AuthFieldErrors, message = "Controlla i campi evidenziati.") => {
    setFieldErrors(errors);
    setFormError(message);
  };

  const submitAuth = async (profile: UserProfile, credentials: AuthCredentials) => {
    setFormError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      const result = await onComplete(profile, credentials);
      if (!result.ok) {
        const message = result.message ?? "Non e stato possibile completare l'accesso.";
        setFormError(message);
        if (credentials.mode === "signup" && message.toLowerCase().includes("email")) {
          setFieldErrors({ email: message });
          setStep(0);
        }
      }
    } catch {
      setFormError("Non e stato possibile completare l'accesso.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogin = () => {
    if (submitting) return;
    const errors = validateLogin();
    if (hasErrors(errors)) {
      showValidationErrors(errors, "Controlla email e password.");
      return;
    }
    void submitAuth(
      {
        name: email.split("@")[0] || "Utente Evnt",
        email: normalizedEmail(email),
        city: "",
        birthDate: "",
        bio: "",
        interests: []
      },
      { mode: "login", password }
    );
  };

  const submitSignup = async () => {
    if (submitting) return;
    const errors = {
      ...validateSignupStep(0),
      ...validateSignupStep(1),
      ...validateSignupStep(2)
    };
    if (hasErrors(errors)) {
      showValidationErrors(errors);
      if (errors.email || errors.password || errors.confirmPassword) {
        setStep(0);
      } else if (errors.name || errors.birthDate || errors.city) {
        setStep(1);
      }
      return;
    }
    const exactCity = await resolveCity();
    if (!exactCity) {
      showValidationErrors({ city: "Seleziona una citta dai suggerimenti." });
      setStep(1);
      return;
    }
    void submitAuth(
      {
        name: name.trim(),
        email: normalizedEmail(email),
        city: exactCity.name,
        cityCoordinates: exactCity?.coordinates,
        birthDate,
        bio: bio.trim(),
        interests,
        avatar: avatar.trim() || undefined
      },
      { mode: "signup", password }
    );
  };

  const goNext = async () => {
    if (submitting) return;
    const errors = validateSignupStep(step);
    if (hasErrors(errors)) {
      showValidationErrors(errors);
      return;
    }

    if (step === 0) {
      setSubmitting(true);
      try {
        const nextEmail = normalizedEmail(email);
        const available = await api.emailAvailable(nextEmail);
        if (!available) {
          showValidationErrors(
            { email: "Questa email e gia registrata. Accedi oppure usa un'altra email." },
            "Email gia registrata."
          );
          return;
        }
        setEmail(nextEmail);
      } catch (error) {
        const message =
          error instanceof ApiError && error.status === 400
            ? "Inserisci un'email valida."
            : "Non riesco a verificare l'email. Controlla la connessione al backend.";
        showValidationErrors({ email: message }, message);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    if (step === 1) {
      setSubmitting(true);
      const exactCity = await resolveCity();
      setSubmitting(false);
      if (!exactCity) {
        showValidationErrors({ city: "Seleziona una citta dai suggerimenti." });
        return;
      }
      setCity(exactCity.name);
      setSelectedCity(exactCity);
    }

    if (step < 2) {
      setFormError("");
      setFieldErrors({});
      setStep((current) => current + 1);
      return;
    }
    void submitSignup();
  };

  const openSignup = () => {
    setMode("signup");
    setStep(0);
    setFormError("");
    setFieldErrors({});
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setAuthView("form");
  };

  const openLogin = () => {
    setMode("login");
    setFormError("");
    setFieldErrors({});
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setAuthView("form");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboard}>
      <View style={[styles.container, isCompactHeight && styles.containerCompact]}>
        {authView === "welcome" ? (
          <View style={styles.welcome}>
            <Text style={[styles.welcomeTitle, isCompactHeight && styles.welcomeTitleCompact]}>Evnt</Text>
            <Text style={styles.welcomeDescription}>
              Eventi vicini, persone affini, uscite semplici.
            </Text>

            <View style={styles.welcomeActions}>
              <Pressable accessibilityRole="button" onPress={openLogin} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Accedi</Text>
                <Ionicons color={colors.surface} name="log-in-outline" size={18} />
              </Pressable>
              <Pressable accessibilityRole="button" onPress={openSignup} style={styles.outlineButton}>
                <Text style={styles.outlineText}>Registrati</Text>
                <Ionicons color={colors.primary} name="person-add-outline" size={18} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.formShell, isCompactHeight && styles.formShellCompact]}>
            <View style={styles.formNav}>
              <Pressable accessibilityRole="button" onPress={() => setAuthView("welcome")} style={styles.backLink}>
                <Ionicons color={colors.ink} name="chevron-back" size={20} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={mode === "signup" ? openLogin : openSignup}
                style={styles.switchLink}
              >
                <Text style={styles.switchLinkText}>{mode === "signup" ? "Accedi" : "Registrati"}</Text>
              </Pressable>
            </View>
            <View style={[styles.panel, isCompactHeight && styles.panelCompact]}>
          {mode === "signup" ? (
            <>
              <View style={[styles.formBody, isCompactHeight && styles.formBodyCompact]}>
                <View style={styles.formHeader}>
                  <View>
                    <Text style={styles.formKicker}>{progress}</Text>
                    <Text style={[styles.formTitle, isCompactHeight && styles.formTitleCompact]}>{stepTitle}</Text>
                  </View>
                  <View style={styles.stepPills}>
                    {[0, 1, 2].map((item) => (
                      <View key={item} style={[styles.stepPill, item <= step && styles.stepPillActive]} />
                    ))}
                  </View>
                </View>

                {helperText.length > 0 && <Text style={styles.helper}>{helperText}</Text>}
                {formError.length > 0 && <Text style={styles.errorText}>{formError}</Text>}

                {step === 0 && (
                  <>
                    <Field error={fieldErrors.email} label="Email">
                      <View style={styles.emailInputWrap}>
                        <TextInput
                          autoCapitalize="none"
                          autoComplete="email"
                          autoCorrect={false}
                          keyboardType="email-address"
                          onChangeText={(value) => {
                            setEmail(value);
                            clearFieldError("email");
                          }}
                          placeholder="nome@email.it"
                          placeholderTextColor={form.placeholder.color}
                          style={styles.emailInput}
                          textContentType="emailAddress"
                          value={email}
                        />
                      </View>
                    </Field>
                    <Field error={fieldErrors.password} label="Password">
                      <PasswordInput
                        onChangeText={(value) => {
                          setPassword(value);
                          clearFieldError("password");
                        }}
                        placeholder="Minimo 6 caratteri"
                        onToggleVisibility={() => setPasswordVisible((current) => !current)}
                        value={password}
                        visible={passwordVisible}
                      />
                    </Field>
                    <Field error={fieldErrors.confirmPassword} label="Conferma password">
                      <PasswordInput
                        onChangeText={(value) => {
                          setConfirmPassword(value);
                          clearFieldError("confirmPassword");
                        }}
                        placeholder="Ripeti password"
                        onToggleVisibility={() => setConfirmPasswordVisible((current) => !current)}
                        value={confirmPassword}
                        visible={confirmPasswordVisible}
                      />
                    </Field>
                  </>
                )}

                {step === 1 && (
                  <>
                    <Field error={fieldErrors.name} label="Nome">
                      <TextInput
                        autoCapitalize="words"
                        onChangeText={(value) => {
                          setName(value);
                          clearFieldError("name");
                        }}
                        placeholder="Il tuo nome"
                        placeholderTextColor={form.placeholder.color}
                        style={styles.input}
                        value={name}
                      />
                    </Field>
                    <Field error={fieldErrors.birthDate} label="Data di nascita">
                      <DateTimePickerField
                        maximumDate={today}
                        mode="date"
                        onChange={(value) => {
                          setBirthDate(value);
                          clearFieldError("birthDate");
                        }}
                        placeholder="Seleziona la data"
                        value={birthDate}
                      />
                    </Field>
                    <Field error={fieldErrors.city} label="Citta *">
                      <View style={styles.autocompleteWrap}>
                        <View style={styles.cityInputWrap}>
                          <TextInput
                            autoCapitalize="words"
                            autoCorrect={false}
                            onBlur={() => setTimeout(() => setCitySuggestionsOpen(false), 120)}
                            onChangeText={handleCityChange}
                            onFocus={() => setCitySuggestionsOpen(true)}
                            placeholder="Es. Roma"
                            placeholderTextColor={form.placeholder.color}
                            style={styles.cityInput}
                            value={city}
                          />
                          <Pressable
                            accessibilityLabel="Usa la citta attuale"
                            accessibilityRole="button"
                            disabled={cityLocating}
                            hitSlop={8}
                            onPress={() => void useCurrentCity()}
                            style={[styles.locateFieldButton, cityLocating && styles.locateFieldButtonDisabled]}
                          >
                            <Ionicons color={selectedCity ? colors.ink : colors.muted} name="locate-outline" size={19} />
                          </Pressable>
                        </View>

                        {citySuggestionsOpen && filteredCitySuggestions.length > 0 && (
                          <View style={styles.suggestionList}>
                            {filteredCitySuggestions.map((suggestion, index) => (
                              <Pressable
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
                                <Text style={styles.suggestionTitle}>Cerco citta...</Text>
                                <Text style={styles.suggestionMeta}>OpenStreetMap</Text>
                              </View>
                            </View>
                          </View>
                        )}
                      </View>
                    </Field>
                  </>
                )}

                {step === 2 && (
                  <>
                    <Field error={fieldErrors.avatar} label="Immagine profilo">
                      <ProfileImagePicker
                        onChange={(value) => {
                          setAvatar(value);
                          clearFieldError("avatar");
                        }}
                        value={avatar}
                      />
                    </Field>
                    <Field error={fieldErrors.bio} label="Bio">
                      <TextInput
                        multiline
                        onChangeText={(value) => {
                          setBio(value);
                          clearFieldError("bio");
                        }}
                        placeholder="Racconta in poche parole cosa ti piace fare."
                        placeholderTextColor={form.placeholder.color}
                        style={[styles.input, styles.textArea]}
                        value={bio}
                      />
                    </Field>
                    <FormField error={fieldErrors.interests} label="Interessi">
                      <View style={styles.chips}>
                        {categories.map((category) => (
                          <CategoryChip
                            category={category}
                            key={category}
                            onPress={() => toggleInterest(category)}
                            selected={interests.includes(category)}
                          />
                        ))}
                      </View>
                    </FormField>
                  </>
                )}
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={step === 0}
                  onPress={() => {
                    setFormError("");
                    setFieldErrors({});
                    setStep((current) => Math.max(0, current - 1));
                  }}
                  style={[styles.secondaryButton, styles.actionButton, step === 0 && styles.disabledSecondary]}
                >
                  <Ionicons color={step === 0 ? colors.muted : colors.ink} name="arrow-back" size={18} />
                  <Text style={[styles.secondaryText, step === 0 && styles.disabledSecondaryText]}>Indietro</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => void goNext()}
                  style={[styles.primaryButton, styles.actionButton, submitting && styles.disabledButton]}
                >
                  <Text style={styles.primaryText}>
                    {submitting ? (step === 0 ? "Controllo..." : "Attendi...") : step === 2 ? "Completa" : "Avanti"}
                  </Text>
                  <Ionicons color={colors.surface} name="arrow-forward" size={18} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={[styles.formBody, isCompactHeight && styles.formBodyCompact]}>
                <View style={styles.formHeader}>
                  <View>
                    <Text style={[styles.formTitle, isCompactHeight && styles.formTitleCompact]}>Accedi</Text>
                  </View>
                </View>
                {helperText.length > 0 && <Text style={styles.helper}>{helperText}</Text>}
                {formError.length > 0 && <Text style={styles.errorText}>{formError}</Text>}
                <Field error={fieldErrors.email} label="Email">
                  <View style={styles.emailInputWrap}>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      onChangeText={(value) => {
                        setEmail(value);
                        clearFieldError("email");
                      }}
                      placeholder="nome@email.it"
                      placeholderTextColor={form.placeholder.color}
                      style={styles.emailInput}
                      textContentType="emailAddress"
                      value={email}
                    />
                  </View>
                </Field>
                <Field error={fieldErrors.password} label="Password">
                  <PasswordInput
                    onChangeText={(value) => {
                      setPassword(value);
                      clearFieldError("password");
                    }}
                    placeholder="La tua password"
                    onToggleVisibility={() => setPasswordVisible((current) => !current)}
                    value={password}
                    visible={passwordVisible}
                  />
                </Field>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={submitLogin}
                style={[styles.primaryButton, submitting && styles.disabledButton]}
              >
                <Text style={styles.primaryText}>{submitting ? "Attendi..." : "Accedi"}</Text>
                <Ionicons color={colors.surface} name="log-in-outline" size={18} />
              </Pressable>
            </>
          )}
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

type FieldProps = {
  children: ReactNode;
  error?: string;
  label: string;
};

function Field({ children, error, label }: FieldProps) {
  return (
    <FormField error={error} label={label}>
      {children}
    </FormField>
  );
}

type PasswordInputProps = {
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  placeholder: string;
  value: string;
  visible: boolean;
};

function PasswordInput({
  onChangeText,
  onToggleVisibility,
  placeholder,
  value,
  visible
}: PasswordInputProps) {
  return (
    <View style={styles.passwordInputWrap}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={form.placeholder.color}
        secureTextEntry={!visible}
        style={styles.passwordInput}
        textContentType="password"
        value={value}
      />
      <Pressable
        accessibilityLabel={visible ? "Nascondi password" : "Mostra password"}
        accessibilityRole="button"
        onPress={onToggleVisibility}
        style={styles.passwordToggle}
      >
        <Ionicons color={colors.ink} name={visible ? "eye-off-outline" : "eye-outline"} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    backgroundColor: colors.background,
    flex: 1
  },
  container: {
    alignItems: "stretch",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    width: "100%"
  },
  containerCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  welcome: {
    alignItems: "stretch",
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    width: "100%"
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: 50,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 56,
    textAlign: "left"
  },
  welcomeTitleCompact: {
    fontSize: 44,
    lineHeight: 48
  },
  welcomeDescription: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    maxWidth: 300
  },
  welcomeActions: {
    alignSelf: "stretch",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  formShell: {
    alignSelf: "stretch",
    flex: 1,
    gap: spacing.md,
    justifyContent: "flex-start",
    width: "100%"
  },
  formShellCompact: {
    gap: spacing.sm
  },
  panel: {
    flex: 1,
    gap: spacing.lg,
    justifyContent: "flex-start",
    width: "100%"
  },
  panelCompact: {
    gap: spacing.md
  },
  formBody: {
    gap: spacing.sm,
    width: "100%"
  },
  formBodyCompact: {
    gap: spacing.xs
  },
  formNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  backLink: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  switchLink: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  switchLinkText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  formHeader: {
    gap: spacing.sm
  },
  formKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  formTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30
  },
  formTitleCompact: {
    fontSize: 22,
    lineHeight: 26
  },
  stepPills: {
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs
  },
  stepPill: {
    backgroundColor: colors.line,
    borderRadius: 4,
    height: 5,
    width: 32
  },
  stepPillActive: { backgroundColor: colors.primary },
  helper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  errorText: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    ...form.fieldText
  },
  passwordInput: {
    flex: 1,
    minHeight: 44,
    ...form.fieldText
  },
  passwordInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs
  },
  passwordToggle: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: "center",
    width: 40
  },
  emailInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingLeft: spacing.md,
    paddingRight: spacing.md
  },
  emailInput: {
    flex: 1,
    minHeight: 44,
    ...form.fieldText
  },
  textArea: {
    minHeight: 76,
    paddingTop: spacing.sm,
    textAlignVertical: "top"
  },
  autocompleteWrap: {
    position: "relative",
    zIndex: 20
  },
  cityInput: {
    flex: 1,
    minHeight: 44,
    ...form.fieldText
  },
  cityInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md
  },
  locateFieldButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  locateFieldButtonDisabled: {
    opacity: 0.55
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  outlineButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  outlineText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900"
  },
  disabledButton: { backgroundColor: colors.muted },
  primaryText: {
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
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48
  },
  actionButton: {
    flex: 1
  },
  disabledSecondary: { backgroundColor: colors.surfaceMuted },
  secondaryText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  disabledSecondaryText: { color: colors.muted },
  suggestionCopy: {
    flex: 1
  },
  suggestionIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  suggestionList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 50,
    zIndex: 30,
    ...shadow
  },
  suggestionMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  suggestionRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  }
});

import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
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
import { DateTimePickerField } from "../components/DateTimePickerField";
import { ProfileImagePicker } from "../components/ProfileImagePicker";
import { api, ApiError } from "../api";
import { searchCitiesWorldwide } from "../api/geocoding";
import { citySuggestions, type CitySuggestion } from "../data/cities";
import { categories } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
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

export function AuthScreen({ onComplete }: AuthScreenProps) {
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
    if (mode === "login") return "Inserisci email e password per accedere.";
    if (step === 0) return "Usa una password di almeno 6 caratteri.";
    if (step === 1) return "La citta serve per mostrarti eventi vicini anche senza geolocalizzazione.";
    return `Seleziona almeno 3 interessi. Ora: ${interests.length}/3.`;
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
      return citySuggestions.slice(0, 5);
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
      .slice(0, 6);
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
    const fallbackCity = citySuggestions.find((suggestion) => suggestion.name === "Salerno");
    void submitAuth(
      {
        name: email.split("@")[0] || "Utente Evnt",
        email: normalizedEmail(email),
        city: "Salerno",
        cityCoordinates: fallbackCity?.coordinates,
        birthDate: "2000-01-01",
        bio: "Bentornato su Evnt.",
        interests: ["Concerto", "Food", "Sport"]
      },
      { mode: "login", password }
    );
  };

  const submitSignup = () => {
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
    const exactCity =
      selectedCity ??
      filteredCitySuggestions.find((suggestion) => suggestion.name.toLowerCase() === city.trim().toLowerCase());
    void submitAuth(
      {
        name: name.trim(),
        email: normalizedEmail(email),
        city: city.trim(),
        cityCoordinates: exactCity?.coordinates,
        birthDate,
        bio: bio.trim() || "Pronto a scoprire nuovi eventi in zona.",
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

    if (step < 2) {
      setFormError("");
      setFieldErrors({});
      setStep((current) => current + 1);
      return;
    }
    submitSignup();
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {authView === "welcome" ? (
          <View style={styles.welcome}>
            <View style={styles.welcomeLogo}>
              <Ionicons color={colors.surface} name="radio-outline" size={42} />
            </View>
            <Text style={styles.welcomeTitle}>Evnt</Text>
            <Text style={styles.welcomeDescription}>
              Scopri eventi vicino a te, partecipa con persone affini e organizza uscite in pochi tocchi.
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
          <>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Ionicons color={colors.surface} name="radio-outline" size={24} />
              </View>
              <Text style={styles.logoText}>Evnt</Text>
            </View>

            <Text style={styles.title}>
              {mode === "signup" ? "Crea il tuo spazio in Evnt." : "Bentornato su Evnt."}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "signup"
                ? "Completa i passaggi e personalizziamo subito il tuo feed."
                : "Accedi con email e password per continuare."}
            </Text>

            <View style={styles.panel}>
              <View style={styles.formNav}>
                <Pressable accessibilityRole="button" onPress={() => setAuthView("welcome")} style={styles.backLink}>
                  <Ionicons color={colors.muted} name="chevron-back" size={18} />
                  <Text style={styles.backLinkText}>Torna</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={mode === "signup" ? openLogin : openSignup}
                  style={styles.switchLink}
                >
                  <Text style={styles.switchLinkText}>
                    {mode === "signup" ? "Hai gia un account?" : "Nuovo su Evnt?"}
                  </Text>
                </Pressable>
              </View>

          {mode === "signup" ? (
            <>
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formKicker}>Step {progress}</Text>
                  <Text style={styles.formTitle}>{stepTitle}</Text>
                </View>
                <View style={styles.stepPills}>
                  {[0, 1, 2].map((item) => (
                    <View key={item} style={[styles.stepPill, item <= step && styles.stepPillActive]} />
                  ))}
                </View>
              </View>

                      <Text style={styles.helper}>{helperText}</Text>
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
                        placeholderTextColor={colors.muted}
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
                      placeholderTextColor={colors.muted}
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
                          placeholder="Es. Salerno"
                          placeholderTextColor={colors.muted}
                          style={styles.cityInput}
                          value={city}
                        />
                        <Ionicons color={colors.muted} name="search-outline" size={19} />
                      </View>

                      {citySuggestionsOpen && filteredCitySuggestions.length > 0 && (
                        <View style={styles.suggestionList}>
                          {filteredCitySuggestions.map((suggestion) => (
                            <Pressable
                              accessibilityRole="button"
                              key={suggestion.name}
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
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.textArea]}
                      value={bio}
                    />
                  </Field>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Interessi</Text>
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
                    {fieldErrors.interests ? <Text style={styles.fieldErrorText}>{fieldErrors.interests}</Text> : null}
                  </View>
                </>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={step === 0}
                  onPress={() => {
                    setFormError("");
                    setFieldErrors({});
                    setStep((current) => Math.max(0, current - 1));
                  }}
                  style={[styles.secondaryButton, step === 0 && styles.disabledSecondary]}
                >
                  <Ionicons color={step === 0 ? colors.muted : colors.ink} name="arrow-back" size={18} />
                  <Text style={[styles.secondaryText, step === 0 && styles.disabledSecondaryText]}>Indietro</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={submitting}
                  onPress={() => void goNext()}
                  style={[styles.primaryButton, submitting && styles.disabledButton]}
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
              <View style={styles.formHeader}>
                <View>
                  <Text style={styles.formKicker}>Bentornato</Text>
                  <Text style={styles.formTitle}>Accedi con email</Text>
                </View>
                <Ionicons color={colors.primary} name="lock-closed-outline" size={26} />
              </View>
              <Text style={styles.helper}>{helperText}</Text>
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
                    placeholderTextColor={colors.muted}
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
          </>
        )}
      </ScrollView>
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
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
    </View>
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
        placeholderTextColor={colors.muted}
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
  keyboard: { flex: 1 },
  container: {
    flexGrow: 1,
    gap: spacing.lg,
    justifyContent: "center",
    padding: spacing.xl
  },
  welcome: {
    alignItems: "center",
    gap: spacing.lg,
    justifyContent: "center",
    minHeight: 560
  },
  welcomeLogo: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 32,
    height: 96,
    justifyContent: "center",
    width: 96,
    ...shadow
  },
  welcomeTitle: {
    color: colors.ink,
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 54
  },
  welcomeDescription: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 25,
    maxWidth: 330,
    textAlign: "center"
  },
  welcomeActions: {
    alignSelf: "stretch",
    gap: spacing.md,
    marginTop: spacing.md
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  logoText: { color: colors.ink, fontSize: 28, fontWeight: "900" },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  formNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  backLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    paddingVertical: spacing.xs
  },
  backLinkText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  switchLink: {
    paddingVertical: spacing.xs
  },
  switchLinkText: {
    color: colors.teal,
    fontSize: 13,
    fontWeight: "900"
  },
  formHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  formKicker: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  formTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2
  },
  stepPills: {
    flexDirection: "row",
    gap: spacing.xs
  },
  stepPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 5,
    height: 10,
    width: 28
  },
  stepPillActive: { backgroundColor: colors.primary },
  helper: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  errorText: {
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
  fieldErrorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16
  },
  fieldGroup: { gap: spacing.sm },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  passwordInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 46
  },
  passwordInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs
  },
  passwordToggle: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 42
  },
  emailInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.md
  },
  emailInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 46
  },
  textArea: {
    minHeight: 104,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  autocompleteWrap: {
    gap: spacing.sm
  },
  cityInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 46
  },
  cityInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50
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
    minHeight: 50
  },
  outlineText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "900"
  },
  disabledButton: { backgroundColor: "#B9B2A7" },
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
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50
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
    height: 36,
    justifyContent: "center",
    width: 36
  },
  suggestionList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
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
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  suggestionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  }
});

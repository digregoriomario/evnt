import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo, useState } from "react";
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
import { categories } from "../data/events";
import { colors, radius, shadow, spacing } from "../theme";
import { Category, UserProfile } from "../types";

export type AuthCredentials = { mode: "login" | "signup"; password: string };
export type AuthResult = { ok: boolean; message?: string };

type AuthScreenProps = {
  onComplete: (profile: UserProfile, credentials?: AuthCredentials) => Promise<AuthResult>;
};

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const [authView, setAuthView] = useState<"welcome" | "form">("welcome");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<Category[]>([]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loginReady = email.includes("@") && password.length >= 6;
  const accountReady = email.includes("@") && password.length >= 6 && password === confirmPassword;
  const aboutReady = name.trim().length >= 2 && birthDate.trim().length >= 10;
  const profileReady = interests.length >= 3;
  const currentStepReady = step === 0 ? accountReady : step === 1 ? aboutReady : profileReady;

  const stepTitle = ["Crea il tuo account", "Parlaci di te", "Completa il tuo profilo"][step];
  const progress = `${step + 1}/3`;

  const helperText = useMemo(() => {
    if (mode === "login") return "Inserisci email e password per accedere.";
    if (step === 0) return "Usa una password di almeno 6 caratteri.";
    if (step === 1) return "La data serve per verificare il requisito 16+.";
    return `Seleziona almeno 3 interessi. Ora: ${interests.length}/3.`;
  }, [interests.length, mode, step]);

  const toggleInterest = (category: Category) => {
    setInterests((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const insertAtSign = () => {
    setEmail((current) => (current.includes("@") ? current : `${current}@`));
  };

  const submitAuth = async (profile: UserProfile, credentials: AuthCredentials) => {
    setFormError("");
    setSubmitting(true);
    try {
      const result = await onComplete(profile, credentials);
      if (!result.ok) {
        setFormError(result.message ?? "Non e stato possibile completare l'accesso.");
      }
    } catch {
      setFormError("Non e stato possibile completare l'accesso.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLogin = () => {
    if (!loginReady || submitting) return;
    void submitAuth(
      {
        name: email.split("@")[0] || "Utente Evnt",
        email,
        city: "Salerno",
        birthDate: "2000-01-01",
        bio: "Bentornato su Evnt.",
        interests: ["Concerto", "Food", "Sport"]
      },
      { mode: "login", password }
    );
  };

  const submitSignup = () => {
    if (!profileReady || submitting) return;
    void submitAuth(
      {
        name: name.trim(),
        email,
        city: "Salerno",
        birthDate,
        bio: bio.trim() || "Pronto a scoprire nuovi eventi in zona.",
        interests,
        avatar: avatar.trim() || undefined
      },
      { mode: "signup", password }
    );
  };

  const goNext = () => {
    if (!currentStepReady || submitting) return;
    if (step < 2) {
      setFormError("");
      setStep((current) => current + 1);
      return;
    }
    submitSignup();
  };

  const openSignup = () => {
    setMode("signup");
    setStep(0);
    setAuthView("form");
  };

  const openLogin = () => {
    setMode("login");
    setAuthView("form");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
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
                  <Field label="Email">
                    <View style={styles.emailInputWrap}>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        keyboardType="email-address"
                        onChangeText={setEmail}
                        placeholder="nome@email.it"
                        placeholderTextColor={colors.muted}
                        style={styles.emailInput}
                        textContentType="emailAddress"
                        value={email}
                      />
                      <Pressable accessibilityLabel="Inserisci chiocciola" onPress={insertAtSign} style={styles.atButton}>
                        <Text style={styles.atButtonText}>@</Text>
                      </Pressable>
                    </View>
                  </Field>
                  <Field label="Password">
                    <TextInput
                      onChangeText={setPassword}
                      placeholder="Minimo 6 caratteri"
                      placeholderTextColor={colors.muted}
                      secureTextEntry
                      style={styles.input}
                      value={password}
                    />
                  </Field>
                  <Field label="Conferma password">
                    <TextInput
                      onChangeText={setConfirmPassword}
                      placeholder="Ripeti password"
                      placeholderTextColor={colors.muted}
                      secureTextEntry
                      style={styles.input}
                      value={confirmPassword}
                    />
                  </Field>
                </>
              )}

              {step === 1 && (
                <>
                  <Field label="Nome">
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={setName}
                      placeholder="Il tuo nome"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      value={name}
                    />
                  </Field>
                  <Field label="Data di nascita">
                    <TextInput
                      onChangeText={setBirthDate}
                      placeholder="AAAA-MM-GG"
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      value={birthDate}
                    />
                  </Field>
                </>
              )}

              {step === 2 && (
                <>
                  <Field label="Immagine profilo">
                    <View style={styles.avatarRow}>
                      <View style={styles.avatarPreview}>
                        <Ionicons color={colors.teal} name="image-outline" size={24} />
                      </View>
                      <TextInput
                        autoCapitalize="none"
                        onChangeText={setAvatar}
                        placeholder="Link immagine opzionale"
                        placeholderTextColor={colors.muted}
                        style={[styles.input, styles.avatarInput]}
                        value={avatar}
                      />
                    </View>
                  </Field>
                  <Field label="Bio">
                    <TextInput
                      multiline
                      onChangeText={setBio}
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
                  </View>
                </>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={step === 0}
                  onPress={() => setStep((current) => Math.max(0, current - 1))}
                  style={[styles.secondaryButton, step === 0 && styles.disabledSecondary]}
                >
                  <Ionicons color={step === 0 ? colors.muted : colors.ink} name="arrow-back" size={18} />
                  <Text style={[styles.secondaryText, step === 0 && styles.disabledSecondaryText]}>Indietro</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!currentStepReady || submitting}
                  onPress={goNext}
                  style={[styles.primaryButton, (!currentStepReady || submitting) && styles.disabledButton]}
                >
                  <Text style={styles.primaryText}>
                    {submitting ? "Attendi..." : step === 2 ? "Completa" : "Avanti"}
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
              <Field label="Email">
                <View style={styles.emailInputWrap}>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="nome@email.it"
                    placeholderTextColor={colors.muted}
                    style={styles.emailInput}
                    textContentType="emailAddress"
                    value={email}
                  />
                  <Pressable accessibilityLabel="Inserisci chiocciola" onPress={insertAtSign} style={styles.atButton}>
                    <Text style={styles.atButtonText}>@</Text>
                  </Pressable>
                </View>
              </Field>
              <Field label="Password">
                <TextInput
                  onChangeText={setPassword}
                  placeholder="La tua password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={styles.input}
                  value={password}
                />
              </Field>
              <Pressable
                accessibilityRole="button"
                disabled={!loginReady || submitting}
                onPress={submitLogin}
                style={[styles.primaryButton, (!loginReady || submitting) && styles.disabledButton]}
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
  label: string;
};

function Field({ children, label }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
  emailInputWrap: {
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
  emailInput: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 46
  },
  atButton: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.sm,
    height: 36,
    justifyContent: "center",
    width: 42
  },
  atButtonText: {
    color: colors.teal,
    fontSize: 18,
    fontWeight: "900"
  },
  textArea: {
    minHeight: 104,
    paddingTop: spacing.md,
    textAlignVertical: "top"
  },
  avatarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  avatarPreview: {
    alignItems: "center",
    backgroundColor: colors.tealSoft,
    borderRadius: radius.md,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  avatarInput: { flex: 1 },
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
  disabledSecondaryText: { color: colors.muted }
});

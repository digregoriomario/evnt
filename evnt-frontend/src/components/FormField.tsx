import { type ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { form, spacing } from "../theme";

type FormFieldProps = {
  children: ReactNode;
  compact?: boolean;
  error?: string;
  helper?: string;
  label: string;
  labelAccessory?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function FormField({
  children,
  compact = false,
  error,
  helper,
  label,
  labelAccessory,
  style
}: FormFieldProps) {
  return (
    <View style={[styles.field, compact && styles.compact, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {labelAccessory}
      </View>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compact: {
    flex: 1
  },
  error: form.error,
  field: {
    gap: spacing.sm
  },
  helper: form.helper,
  label: form.label,
  labelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between"
  }
});

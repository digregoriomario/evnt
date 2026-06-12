import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, type StyleProp, type TextInputProps, type ViewStyle, View } from "react-native";

import { colors, form, radius, spacing } from "../theme";

type SearchFieldProps = Omit<TextInputProps, "onChangeText" | "placeholder" | "style" | "value"> & {
  accessibilityLabel: string;
  clearLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onChangeText: (value: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
  value: string;
};

export function SearchField({
  accessibilityLabel,
  autoCapitalize = "none",
  clearLabel = "Cancella ricerca",
  icon = "search-outline",
  onChangeText,
  placeholder,
  style,
  value,
  ...props
}: SearchFieldProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons color={colors.muted} name={icon} size={20} />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={form.placeholder.color}
        style={styles.input}
        value={value}
        {...props}
      />
      {value.length > 0 ? (
        <Pressable accessibilityLabel={clearLabel} accessibilityRole="button" onPress={() => onChangeText("")}>
          <Ionicons color={colors.muted} name="close-circle" size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minHeight: 54,
    ...form.fieldText
  },
  wrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md
  }
});

import { ComponentProps } from "react";
import { StyleProp, StyleSheet, TextInput, TextStyle, View, ViewStyle } from "react-native";

import { colors, radius, spacing } from "../../theme";

type InputProps = ComponentProps<typeof View> & {
  isDisabled?: boolean;
  isInvalid?: boolean;
  style?: StyleProp<ViewStyle>;
};

type InputFieldProps = ComponentProps<typeof TextInput> & {
  style?: StyleProp<TextStyle>;
};

export function Input({ children, isDisabled, isInvalid, style, ...props }: InputProps) {
  return (
    <View
      style={[styles.input, isDisabled && styles.disabled, isInvalid && styles.invalid, style]}
      {...props}
    >
      {children}
    </View>
  );
}

export function InputField({ style, ...props }: InputFieldProps) {
  return <TextInput placeholderTextColor={colors.muted} style={[styles.field, style]} {...props} />;
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6
  },
  field: {
    color: colors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 44
  },
  input: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: spacing.md
  },
  invalid: {
    borderColor: colors.danger
  }
});

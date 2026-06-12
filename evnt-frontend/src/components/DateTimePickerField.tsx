import { createElement, type CSSProperties } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, form, radius, spacing } from "../theme";

type DateTimePickerFieldProps = {
  maximumDate?: Date;
  minimumDate?: Date;
  mode: "date" | "time";
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

const inputStyle: CSSProperties = {
  background: "transparent",
  border: 0,
  bottom: 0,
  cursor: "pointer",
  left: 0,
  opacity: 0,
  outline: "none",
  position: "absolute",
  right: 0,
  top: 0,
  width: "100%"
};

const toInputDate = (date?: Date) => {
  if (!date) {
    return undefined;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function formatValue(mode: "date" | "time", value: string) {
  if (!value) {
    return "";
  }

  if (mode === "time") {
    return value;
  }

  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function DateTimePickerField({
  maximumDate,
  minimumDate,
  mode,
  onChange,
  placeholder,
  value
}: DateTimePickerFieldProps) {
  return (
    <View style={styles.wrap}>
      {createElement("input", {
        max: mode === "date" ? toInputDate(maximumDate) : undefined,
        min: mode === "date" ? toInputDate(minimumDate) : undefined,
        onChange: (event: Event) => {
          const target = event.target as HTMLInputElement;
          onChange(target.value);
        },
        style: inputStyle,
        type: mode,
        value
      })}
      {!value && <Text pointerEvents="none" style={styles.placeholder}>{placeholder}</Text>}
      {value && <Text pointerEvents="none" style={styles.displayValue}>{formatValue(mode, value)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: spacing.md,
    position: "relative"
  },
  placeholder: {
    left: spacing.md,
    pointerEvents: "none",
    position: "absolute",
    ...form.placeholder
  },
  displayValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800",
    left: spacing.md,
    pointerEvents: "none",
    position: "absolute"
  }
});

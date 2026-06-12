import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, form, radius, spacing } from "../theme";

type DateTimePickerFieldProps = {
  maximumDate?: Date;
  minimumDate?: Date;
  mode: "date" | "time";
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
};

const formatDateValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatTimeValue = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

function parseValue(mode: "date" | "time", value: string) {
  if (mode === "date" && value) {
    const parsed = new Date(`${value}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (mode === "time" && value) {
    const [hours, minutes] = value.split(":").map((item) => Number.parseInt(item, 10));
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const parsed = new Date();
      parsed.setHours(hours, minutes, 0, 0);
      return parsed;
    }
  }

  return new Date();
}

function displayValue(mode: "date" | "time", value: string) {
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
  const [open, setOpen] = useState(false);
  const pickerValue = useMemo(() => parseValue(mode, value), [mode, value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
    }

    if (event.type !== "set" || !selected) {
      return;
    }

    onChange(mode === "date" ? formatDateValue(selected) : formatTimeValue(selected));
  };

  return (
    <View>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.wrap}>
        <Text style={[styles.value, !value && styles.placeholder]}>
          {value ? displayValue(mode, value) : placeholder}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          mode={mode}
          onChange={handleChange}
          value={pickerValue}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  placeholder: {
    ...form.placeholder
  }
});

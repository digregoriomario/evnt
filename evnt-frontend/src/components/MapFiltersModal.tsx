import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { categories } from "../data/events";
import { colors, radius, spacing } from "../theme";
import { Category } from "../types";
import { CategoryChip } from "./CategoryChip";
import { PillButton } from "./PillButton";

type MapFiltersModalProps = {
  category: Category | "Tutti";
  onCategoryChange: (category: Category | "Tutti") => void;
  onClose: () => void;
  onPriceChange: (price: PriceFilter) => void;
  onRadiusChange: (radiusKm: number) => void;
  onReset: () => void;
  price: PriceFilter;
  radiusKm: number;
  radiusOptions: number[];
  visible: boolean;
};

export type PriceFilter = "tutti" | "gratis" | "pagamento";
export type MapFiltersSheetProps = Omit<MapFiltersModalProps, "visible">;

export function MapFiltersModal({
  category,
  onCategoryChange,
  onClose,
  onPriceChange,
  onRadiusChange,
  onReset,
  price,
  radiusKm,
  radiusOptions,
  visible
}: MapFiltersModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <MapFiltersSheet
          category={category}
          onCategoryChange={onCategoryChange}
          onClose={onClose}
          onPriceChange={onPriceChange}
          onRadiusChange={onRadiusChange}
          onReset={onReset}
          price={price}
          radiusKm={radiusKm}
          radiusOptions={radiusOptions}
        />
      </View>
    </Modal>
  );
}

export function MapFiltersSheet({
  category,
  onCategoryChange,
  onClose,
  onPriceChange,
  onRadiusChange,
  onReset,
  price,
  radiusKm,
  radiusOptions
}: MapFiltersSheetProps) {
  return (
    <View style={styles.filterSheet}>
      <View style={styles.sheetHeader}>
        <View>
          <Text style={styles.sheetEyebrow}>Mappa</Text>
          <Text style={styles.sheetTitle}>Filtri</Text>
        </View>
        <Pressable
          accessibilityLabel="Chiudi filtri"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClose}
          style={styles.closeButton}
        >
          <Ionicons color={colors.ink} name="close" size={22} />
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Categoria</Text>
        <View style={styles.optionGrid}>
          <PillButton
            accent="#5A4BC4"
            label="Tutte"
            onPress={() => onCategoryChange("Tutti")}
            selected={category === "Tutti"}
            soft="#F0EEFF"
          />
          {categories.map((item) => (
            <CategoryChip
              category={item}
              key={item}
              onPress={() => onCategoryChange(item)}
              selected={category === item}
            />
          ))}
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Prezzo</Text>
        <View style={styles.optionGrid}>
          <FilterOption label="Tutti" selected={price === "tutti"} onPress={() => onPriceChange("tutti")} />
          <FilterOption label="Gratis" selected={price === "gratis"} onPress={() => onPriceChange("gratis")} />
          <FilterOption
            label="A pagamento"
            selected={price === "pagamento"}
            onPress={() => onPriceChange("pagamento")}
          />
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.radiusHeader}>
          <Text style={styles.filterLabel}>Raggio d'azione</Text>
          <Text style={styles.radiusValue}>{radiusKm} km</Text>
        </View>
        <View style={styles.optionGrid}>
          {radiusOptions.map((value) => (
            <FilterOption
              key={value}
              label={`${value} km`}
              selected={radiusKm === value}
              onPress={() => onRadiusChange(value)}
            />
          ))}
        </View>
      </View>

      <View style={styles.sheetActions}>
        <Pressable accessibilityRole="button" onPress={onReset} style={styles.secondaryAction}>
          <Text style={styles.secondaryActionText}>Cancella</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.primaryAction}>
          <Text style={styles.primaryActionText}>Mostra eventi</Text>
        </Pressable>
      </View>
    </View>
  );
}

type FilterOptionProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

function FilterOption({ label, onPress, selected }: FilterOptionProps) {
  return (
    <PillButton
      accent={selected ? "#5A4BC4" : colors.ink}
      label={label}
      onPress={onPress}
      selected={selected}
      soft={selected ? "#F0EEFF" : colors.surfaceMuted}
    />
  );
}

const styles = StyleSheet.create({
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  filterLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  filterSection: {
    gap: spacing.md
  },
  filterSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    gap: spacing.xl,
    padding: spacing.xl
  },
  modalOverlay: {
    backgroundColor: "rgba(17, 24, 39, 0.32)",
    flex: 1,
    justifyContent: "flex-end"
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 50
  },
  primaryActionText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  radiusHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  radiusValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "900"
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 50
  },
  secondaryActionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.md
  },
  sheetEyebrow: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  }
});

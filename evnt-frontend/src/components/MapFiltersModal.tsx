import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { categories } from "../data/events";
import { colors, form, radius, spacing } from "../theme";
import { Category, PriceFilter } from "../types";
import { CategoryChip } from "./CategoryChip";
import { IconButton } from "./IconButton";
import { PillButton } from "./PillButton";
import { SearchField } from "./SearchField";

type MapFiltersModalProps = {
  category: Category | "Tutti";
  onCategoryChange: (category: Category | "Tutti") => void;
  onClose: () => void;
  onPriceChange: (price: PriceFilter) => void;
  onQueryChange: (query: string) => void;
  onRadiusChange: (radiusKm: number) => void;
  onReset: () => void;
  price: PriceFilter;
  query: string;
  radiusKm: number;
  radiusOptions: number[];
  visible: boolean;
};

export type MapFiltersSheetProps = Omit<MapFiltersModalProps, "visible">;

export function MapFiltersModal({
  category,
  onCategoryChange,
  onClose,
  onPriceChange,
  onQueryChange,
  onRadiusChange,
  onReset,
  price,
  query,
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
          onQueryChange={onQueryChange}
          onRadiusChange={onRadiusChange}
          onReset={onReset}
          price={price}
          query={query}
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
  onQueryChange,
  onRadiusChange,
  onReset,
  price,
  query,
  radiusKm,
  radiusOptions
}: MapFiltersSheetProps) {
  return (
    <View style={styles.filterSheet}>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Filtri</Text>
        <IconButton
          accessibilityLabel="Chiudi filtri"
          icon="close"
          iconSize={22}
          onPress={onClose}
        />
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Ricerca</Text>
        <SearchField
          accessibilityLabel="Cerca nei filtri"
          onChangeText={onQueryChange}
          placeholder="Titolo, luogo o citta"
          value={query}
        />
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
        <RadiusSegmentedControl
          onChange={onRadiusChange}
          options={radiusOptions}
          value={radiusKm}
        />
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

type RadiusSegmentedControlProps = {
  onChange: (value: number) => void;
  options: number[];
  value: number;
};

function RadiusSegmentedControl({ onChange, options, value }: RadiusSegmentedControlProps) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Pressable
            accessibilityLabel={`Raggio ${option} chilometri`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{option} km</Text>
          </Pressable>
        );
      })}
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
  filterLabel: {
    ...form.label
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
  segmented: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 2,
    padding: 3
  },
  segment: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.xs
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.ink
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

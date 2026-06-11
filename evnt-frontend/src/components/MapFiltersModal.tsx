import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { categories as eventCategories } from "../data/events";
import { colors, form, radius, spacing } from "../theme";
import { Category, PriceFilter } from "../types";
import { CategoryChip } from "./CategoryChip";
import { IconButton } from "./IconButton";
import { PillButton } from "./PillButton";
import { SearchField } from "./SearchField";

type MapFiltersModalProps = {
  onCategoriesChange: (categories: Category[]) => void;
  onClose: () => void;
  onPriceChange: (price: PriceFilter) => void;
  onQueryChange: (query: string) => void;
  onRadiusChange: (radiusKm: number) => void;
  onReset: () => void;
  price: PriceFilter;
  query: string;
  radiusDisabled?: boolean;
  radiusKm: number;
  radiusOptions: number[];
  selectedCategories: Category[];
  showQueryField?: boolean;
  visible: boolean;
};

export type MapFiltersSheetProps = Omit<MapFiltersModalProps, "visible">;

export function MapFiltersModal({
  selectedCategories,
  onCategoriesChange,
  onClose,
  onPriceChange,
  onQueryChange,
  onRadiusChange,
  onReset,
  price,
  query,
  radiusDisabled,
  radiusKm,
  radiusOptions,
  showQueryField,
  visible
}: MapFiltersModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <MapFiltersSheet
          selectedCategories={selectedCategories}
          onCategoriesChange={onCategoriesChange}
          onClose={onClose}
          onPriceChange={onPriceChange}
          onQueryChange={onQueryChange}
          onRadiusChange={onRadiusChange}
          onReset={onReset}
          price={price}
          query={query}
          radiusDisabled={radiusDisabled}
          radiusKm={radiusKm}
          radiusOptions={radiusOptions}
          showQueryField={showQueryField}
        />
      </View>
    </Modal>
  );
}

export function MapFiltersSheet({
  selectedCategories,
  onCategoriesChange,
  onClose,
  onPriceChange,
  onQueryChange,
  onRadiusChange,
  onReset,
  price,
  query,
  radiusDisabled = false,
  radiusKm,
  radiusOptions,
  showQueryField = true
}: MapFiltersSheetProps) {
  const toggleCategory = (item: Category) => {
    const selected = selectedCategories.includes(item);
    onCategoriesChange(
      selected ? selectedCategories.filter((category) => category !== item) : [...selectedCategories, item]
    );
  };

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

      {showQueryField ? (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Ricerca</Text>
          <SearchField
            accessibilityLabel="Cerca nei filtri"
            onChangeText={onQueryChange}
            placeholder="Titolo, luogo o citta"
            value={query}
          />
        </View>
      ) : null}

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Categoria</Text>
        <View style={styles.optionGrid}>
          <PillButton
            accent="#5A4BC4"
            label="Tutte"
            onPress={() => onCategoriesChange([])}
            selected={selectedCategories.length === 0}
            soft="#F0EEFF"
          />
          {eventCategories.map((item) => (
            <CategoryChip
              category={item}
              key={item}
              onPress={() => toggleCategory(item)}
              selected={selectedCategories.includes(item)}
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
          <Text style={styles.radiusValue}>
            {radiusDisabled ? "Citta selezionata" : radiusKm === 0 ? "Tutti" : `${radiusKm} km`}
          </Text>
        </View>
        <RadiusSegmentedControl
          disabled={radiusDisabled}
          onChange={onRadiusChange}
          options={radiusOptions}
          value={radiusKm}
        />
        {radiusDisabled ? (
          <Text style={styles.disabledHint}>Disponibile quando la geolocalizzazione è attiva.</Text>
        ) : null}
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
  disabled?: boolean;
  onChange: (value: number) => void;
  options: number[];
  value: number;
};

function RadiusSegmentedControl({ disabled = false, onChange, options, value }: RadiusSegmentedControlProps) {
  return (
    <View style={[styles.segmented, disabled && styles.segmentedDisabled]}>
      {options.map((option) => {
        const selected = !disabled && value === option;
        return (
          <Pressable
            accessibilityLabel={option === 0 ? "Mostra tutti gli eventi" : `Raggio ${option} chilometri`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected }}
            disabled={disabled}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.segment, selected && styles.segmentActive, disabled && styles.segmentDisabled]}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextActive, disabled && styles.segmentTextDisabled]}>
              {option === 0 ? "Tutti" : `${option} km`}
            </Text>
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
  disabledHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
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
    flexWrap: "wrap",
    gap: 2,
    padding: 3
  },
  segmentedDisabled: {
    opacity: 0.62
  },
  segment: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexBasis: "23%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 66,
    paddingHorizontal: spacing.xs
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1
  },
  segmentDisabled: {
    backgroundColor: "transparent"
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.ink
  },
  segmentTextDisabled: {
    color: colors.muted
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

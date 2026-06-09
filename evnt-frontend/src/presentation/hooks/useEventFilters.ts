import { useCallback, useState } from "react";

import { defaultEventFilters } from "../../application/events/eventFiltering";
import { EventFilterState } from "../../types";

export function useEventFilters(initialFilters: EventFilterState = defaultEventFilters) {
  const [filters, setFilters] = useState<EventFilterState>(initialFilters);

  const updateFilters = useCallback((updates: Partial<EventFilterState>) => {
    setFilters((current) => ({ ...current, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultEventFilters);
  }, []);

  return {
    filters,
    resetFilters,
    updateFilters
  };
}

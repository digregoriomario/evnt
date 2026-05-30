import { createContext, ReactNode, useContext } from "react";
import { View } from "react-native";

import { colors, radius, spacing } from "../../theme";

const gluestackTheme = { colors, radius, spacing };
type GluestackTheme = typeof gluestackTheme;
const GluestackContext = createContext<GluestackTheme>(gluestackTheme);

type GluestackUIProviderProps = {
  children: ReactNode;
};

export function GluestackUIProvider({ children }: GluestackUIProviderProps) {
  return (
    <GluestackContext.Provider value={gluestackTheme}>
      <View style={{ flex: 1 }}>{children}</View>
    </GluestackContext.Provider>
  );
}

export function useGluestackTheme() {
  return useContext(GluestackContext);
}

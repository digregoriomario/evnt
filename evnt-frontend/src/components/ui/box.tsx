import { ComponentProps, ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";

type BoxProps = ComponentProps<typeof View> & {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Box({ children, style, ...props }: BoxProps) {
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

export function HStack({ children, style, ...props }: BoxProps) {
  return (
    <View style={[{ alignItems: "center", flexDirection: "row" }, style]} {...props}>
      {children}
    </View>
  );
}

export function VStack({ children, style, ...props }: BoxProps) {
  return (
    <View style={[{ flexDirection: "column" }, style]} {...props}>
      {children}
    </View>
  );
}

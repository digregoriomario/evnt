import { ComponentProps, ReactNode } from "react";
import { StyleProp, Text as RNText, TextStyle } from "react-native";

type TextProps = ComponentProps<typeof RNText> & {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<TextStyle>;
};

export function Text({ children, style, ...props }: TextProps) {
  return (
    <RNText style={style} {...props}>
      {children}
    </RNText>
  );
}

export function Heading({ children, style, ...props }: TextProps) {
  return (
    <RNText style={[{ fontWeight: "900" }, style]} {...props}>
      {children}
    </RNText>
  );
}

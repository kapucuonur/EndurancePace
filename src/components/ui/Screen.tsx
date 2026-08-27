import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type Edge, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenProps {
  children: ReactNode;
  /** Which safe-area edges to pad. Defaults to top + horizontal. */
  edges?: Edge[];
  /** Extra classes on the inner content wrapper. */
  className?: string;
}

/** Full-bleed themed screen background with a safe-area content area. */
export function Screen({ children, edges = ['top', 'left', 'right'], className }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const pad = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };
  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <View style={{ flex: 1, ...pad }}>
        <View className={`flex-1 ${className ?? ''}`}>{children}</View>
      </View>
    </View>
  );
}

import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

const BASE =
  'rounded-lg border border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark';

export function Card({ children, onPress, className }: CardProps) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${BASE} active:opacity-70 ${className ?? ''}`}>
        {children}
      </Pressable>
    );
  }
  return <View className={`${BASE} ${className ?? ''}`}>{children}</View>;
}

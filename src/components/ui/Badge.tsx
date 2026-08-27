import { Text, View } from 'react-native';

interface Props {
  label: string;
  /** Solid background color (hex). When set, text is white. */
  color?: string;
  className?: string;
}

export function Badge({ label, color, className }: Props) {
  if (color) {
    return (
      <View
        className={`rounded-full px-sm py-xs ${className ?? ''}`}
        style={{ backgroundColor: color }}>
        <Text className="text-xs font-semibold text-white">{label}</Text>
      </View>
    );
  }
  return (
    <View
      className={`rounded-full border border-border bg-surface-alt px-sm py-xs dark:border-border-dark dark:bg-surface-alt-dark ${
        className ?? ''
      }`}>
      <Text className="text-xs font-medium text-muted dark:text-muted-dark">{label}</Text>
    </View>
  );
}

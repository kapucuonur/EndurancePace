import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand active:bg-brand-dark hover:opacity-90',
  secondary:
    'bg-surface-alt border border-border dark:bg-surface-alt-dark dark:border-border-dark',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-fg dark:text-fg-dark',
  ghost: 'text-brand',
  danger: 'text-white',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  className,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`h-12 flex-row items-center justify-center rounded-md px-lg ${CONTAINER[variant]} ${
        disabled ? 'opacity-40' : ''
      } ${className ?? ''}`}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#2F6FED'}
        />
      ) : (
        <Text className={`text-base font-semibold ${LABEL[variant]}`}>{label}</Text>
      )}
    </Pressable>
  );
}

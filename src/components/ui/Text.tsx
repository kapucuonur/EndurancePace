import { Text as RNText, type TextProps } from 'react-native';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const VARIANT_CLASS: Record<Variant, string> = {
  display: 'text-3xl font-bold',
  title: 'text-2xl font-bold',
  heading: 'text-lg font-semibold',
  body: 'text-base',
  label: 'text-sm font-medium',
  caption: 'text-xs',
};

interface Props extends TextProps {
  variant?: Variant;
  muted?: boolean;
  className?: string;
}

export function Text({ variant = 'body', muted, className, ...rest }: Props) {
  const color = muted ? 'text-muted dark:text-muted-dark' : 'text-fg dark:text-fg-dark';
  return (
    <RNText className={`${VARIANT_CLASS[variant]} ${color} ${className ?? ''}`} {...rest} />
  );
}

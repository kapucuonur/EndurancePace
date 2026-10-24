import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * `keyboardVerticalOffset` for a `KeyboardAvoidingView behavior="padding"`.
 *
 * Android draws edge-to-edge, so the window isn't resized for the keyboard,
 * and RN's reported keyboard height leaves out the system navigation bar —
 * without adding that inset back, the focused field ends up hidden behind the
 * keyboard by exactly the nav bar's height. Pass the stack header height on
 * screens that have one.
 */
export function useKeyboardOffset(headerHeight = 0): number {
  const insets = useSafeAreaInsets();
  return headerHeight + (Platform.OS === 'android' ? insets.bottom : 0);
}

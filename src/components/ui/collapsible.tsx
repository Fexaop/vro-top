import { SymbolView } from 'expo-symbols';
import { PropsWithChildren, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView>
      <Pressable
        style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, pressed && { opacity: 0.7 }]}
        onPress={() => setIsOpen((value) => !value)}>
        <ThemedView type="backgroundElement" style={{ width: Spacing.four, height: Spacing.four, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={14}
            weight="bold"
            tintColor={theme.text}
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          />
        </ThemedView>

        <ThemedText type="small">{title}</ThemedText>
      </Pressable>
      {isOpen && (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedView type="backgroundElement" style={{ marginTop: Spacing.three, borderRadius: Spacing.three, marginLeft: Spacing.four, padding: Spacing.four }}>
            {children}
          </ThemedView>
        </Animated.View>
      )}
    </ThemedView>
  );
}

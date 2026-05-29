import { Slot } from 'expo-router';
import { View } from 'react-native';

// On native this is just a passthrough — tabs handle layout
export function AppShell() {
  return (
    <View style={{ flex: 1 }}>
      <Slot />
    </View>
  );
}

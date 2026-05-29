import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings', animation: 'slide_from_right' }} />
    </Stack>
  );
}

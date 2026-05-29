import { Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTheme } from 'react-native-paper';
import { useAuthStore } from '@/store/auth-store';
import { AppShell } from '@/components/layout/app-shell';

const TAB_ICONS: Record<string, string> = {
  index: 'view-dashboard',
  attendance: 'calendar-check',
  grades: 'school',
  more: 'dots-horizontal-circle',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Dashboard',
  attendance: 'Attendance',
  grades: 'Grades',
  more: 'More',
};

export default function TabsLayout() {
  const { isAuthenticated } = useAuthStore();
  const theme = useTheme();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (Platform.OS === 'web') {
    return <AppShell />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const MaterialCommunityIcons =
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('@expo/vector-icons').MaterialCommunityIcons as React.ComponentType<{
              name: string;
              size: number;
              color: string;
            }>;
          return (
            <MaterialCommunityIcons
              name={TAB_ICONS[route.name] ?? 'circle'}
              size={size}
              color={color as string}
            />
          );
        },
        tabBarLabel: TAB_LABELS[route.name] ?? route.name,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="attendance" />
      <Tabs.Screen name="grades" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}

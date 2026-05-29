import { View } from 'react-native';
import { Drawer } from 'react-native-paper';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from 'react-native-paper';

const NAV_ITEMS = [
  { href: '/(tabs)', label: 'Dashboard', icon: 'view-dashboard' },
  { href: '/(tabs)/attendance', label: 'Attendance', icon: 'calendar-check' },
  { href: '/(tabs)/grades', label: 'Grades', icon: 'school' },
  { href: '/(tabs)/marks', label: 'Marks', icon: 'clipboard-text' },
  { href: '/(tabs)/exam', label: 'Exam Schedule', icon: 'clipboard-list' },
  { href: '/(tabs)/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/(tabs)/hostel', label: 'Hostel', icon: 'home-city' },
  { href: '/(tabs)/lms', label: 'LMS', icon: 'book-open-variant' },
  { href: '/(tabs)/settings', label: 'Settings', icon: 'cog' },
];

export function AppShell() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View className="flex-1 flex-row">
      <View style={{ width: 240, borderRightWidth: 0.5, paddingTop: 16, backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outlineVariant }}>
        <Drawer.Section style={{ marginHorizontal: 0 }}>
          <Drawer.Item
            label="VIT Portal"
            icon="school"
            style={{ opacity: 0.7 }}
          />
          {NAV_ITEMS.map((item) => (
            <Drawer.Item
              key={item.href}
              label={item.label}
              icon={item.icon}
              active={item.href === '/(tabs)' ? (pathname === '/' || pathname === '/(tabs)') : pathname.startsWith(item.href)}
              onPress={() => router.push(item.href as never)}
            />
          ))}
        </Drawer.Section>
      </View>
      <View className="flex-1">
        <Slot />
      </View>
    </View>
  );
}

import { StyleSheet, View } from 'react-native';
import { Drawer } from 'react-native-paper';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from 'react-native-paper';

const NAV_ITEMS = [
  { href: '/(tabs)', label: 'Dashboard', icon: 'view-dashboard' },
  { href: '/(tabs)/attendance', label: 'Attendance', icon: 'calendar-check' },
  { href: '/(tabs)/grades', label: 'Grades', icon: 'school' },
  { href: '/exam', label: 'Exam Schedule', icon: 'clipboard-list' },
  { href: '/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/hostel', label: 'Hostel', icon: 'home-city' },
  { href: '/lms', label: 'LMS', icon: 'book-open-variant' },
  { href: '/vitol', label: 'Vitol', icon: 'laptop' },
  { href: '/settings', label: 'Settings', icon: 'cog' },
];

export function AppShell() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outlineVariant }]}>
        <Drawer.Section title="VIT Portal" style={styles.sectionTitle}>
          {NAV_ITEMS.map((item) => (
            <Drawer.Item
              key={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
              onPress={() => router.push(item.href as never)}
            />
          ))}
        </Drawer.Section>
      </View>
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 240,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
  },
  sectionTitle: { marginHorizontal: 8 },
  content: { flex: 1 },
});

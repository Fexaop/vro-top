import { StyleSheet, View } from 'react-native';
import { Drawer } from 'react-native-paper';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useTheme } from 'react-native-paper';

const NAV_ITEMS = [
  { href: '/(tabs)', label: 'Dashboard', icon: 'view-dashboard' },
  { href: '/(tabs)/attendance', label: 'Attendance', icon: 'calendar-check' },
  { href: '/(tabs)/grades', label: 'Grades', icon: 'school' },
  { href: '/(tabs)/exam', label: 'Exam Schedule', icon: 'clipboard-list' },
  { href: '/(tabs)/calendar', label: 'Calendar', icon: 'calendar' },
  { href: '/(tabs)/hostel', label: 'Hostel', icon: 'home-city' },
  { href: '/(tabs)/lms', label: 'LMS', icon: 'book-open-variant' },
  { href: '/(tabs)/vitol', label: 'Vitol', icon: 'laptop' },
  { href: '/(tabs)/settings', label: 'Settings', icon: 'cog' },
];

export function AppShell() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <View style={[styles.sidebar, { backgroundColor: theme.colors.surface, borderRightColor: theme.colors.outlineVariant }]}>
        <Drawer.Section style={styles.section}>
          <Drawer.Item
            label="VIT Portal"
            icon="school"
            style={styles.sectionHeader}
          />
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
  section: { marginHorizontal: 0 },
  sectionHeader: { opacity: 0.7 },
  content: { flex: 1 },
});

import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Switch, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';
import type { ThemePref, ScraperMode } from '@/store/settings-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const themePref = useSettingsStore((s) => s.theme);
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const showCgpa = useSettingsStore((s) => s.showCgpa);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setScraperMode = useSettingsStore((s) => s.setScraperMode);
  const setShowCgpa = useSettingsStore((s) => s.setShowCgpa);

  const themeOptions: ThemePref[] = ['system', 'light', 'dark'];
  const scraperOptions: ScraperMode[] = ['ondevice', 'cfworker'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <Text variant="headlineMedium" style={styles.title}>Settings</Text>

        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          {themeOptions.map((t) => (
            <List.Item
              key={t}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              onPress={() => setTheme(t)}
              right={() =>
                themePref === t ? <List.Icon icon="check" color={theme.colors.primary} /> : null
              }
            />
          ))}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Display</List.Subheader>
          <List.Item
            title="Show CGPA"
            right={() => <Switch value={showCgpa} onValueChange={setShowCgpa} />}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Scraper Mode</List.Subheader>
          {scraperOptions.map((m) => (
            <List.Item
              key={m}
              title={m === 'ondevice' ? 'On-Device' : 'Cloudflare Worker'}
              description={
                m === 'ondevice'
                  ? 'Scrape directly from this device'
                  : 'Use a deployed CF Worker endpoint'
              }
              onPress={() => setScraperMode(m)}
              right={() =>
                scraperMode === m ? <List.Icon icon="check" color={theme.colors.primary} /> : null
              }
            />
          ))}
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { padding: 16 },
});

import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';
import type { ThemePref, ScraperMode } from '@/store/settings-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const themePref = useSettingsStore((s) => s.theme);
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const showCgpa = useSettingsStore((s) => s.showCgpa);
  const workerUrl = useSettingsStore((s) => s.workerUrl);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setScraperMode = useSettingsStore((s) => s.setScraperMode);
  const setShowCgpa = useSettingsStore((s) => s.setShowCgpa);
  const setWorkerUrl = useSettingsStore((s) => s.setWorkerUrl);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

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
          <List.Item
            title="Attendance Notifications"
            description="Alert when attendance drops below 75%"
            right={() => <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />}
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
                  ? 'Scrape directly from this device (Android only)'
                  : 'Use a deployed CF Worker endpoint (required for Web)'
              }
              onPress={() => setScraperMode(m)}
              right={() =>
                scraperMode === m ? <List.Icon icon="check" color={theme.colors.primary} /> : null
              }
            />
          ))}
          {scraperMode === 'cfworker' && (
            <TextInput
              label="Worker URL"
              value={workerUrl}
              onChangeText={setWorkerUrl}
              placeholder="https://unicc-worker.your-name.workers.dev"
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { padding: 16 },
  input: { marginHorizontal: 16, marginBottom: 8 },
});

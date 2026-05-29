import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, List, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, SEMESTER_LIST } from '@/store/settings-store';
import type { ThemePref, ScraperMode } from '@/store/settings-store';

export default function SettingsScreen() {
  const theme = useTheme();
  const themePref = useSettingsStore((s) => s.theme);
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const showCgpa = useSettingsStore((s) => s.showCgpa);
  const workerUrl = useSettingsStore((s) => s.workerUrl);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setScraperMode = useSettingsStore((s) => s.setScraperMode);
  const setShowCgpa = useSettingsStore((s) => s.setShowCgpa);
  const setWorkerUrl = useSettingsStore((s) => s.setWorkerUrl);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setSelectedSemester = useSettingsStore((s) => s.setSelectedSemester);

  const themeOptions: ThemePref[] = ['system', 'light', 'dark'];
  const scraperOptions: ScraperMode[] = ['ondevice', 'cfworker'];

  const currentSem = SEMESTER_LIST.find((s) => s.code === selectedSemester);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <Text variant="headlineMedium" style={styles.title}>Settings</Text>

        <List.Section>
          <List.Subheader>Semester</List.Subheader>
          <View style={styles.semCard}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
              Active Semester
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
              {currentSem ? `${currentSem.label} (${currentSem.code})` : selectedSemester || 'Not set'}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              This is used for attendance, marks, and exam schedule fetching.
            </Text>
          </View>
          {SEMESTER_LIST.map((sem) => (
            <List.Item
              key={sem.code}
              title={sem.label}
              description={sem.code}
              onPress={() => void setSelectedSemester(sem.code)}
              right={() =>
                selectedSemester === sem.code ? (
                  <List.Icon icon="check-circle" color={theme.colors.primary} />
                ) : null
              }
            />
          ))}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          {themeOptions.map((t) => (
            <List.Item
              key={t}
              title={t.charAt(0).toUpperCase() + t.slice(1)}
              onPress={() => void setTheme(t)}
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
            right={() => <Switch value={showCgpa} onValueChange={(v) => void setShowCgpa(v)} />}
          />
          <List.Item
            title="Attendance Notifications"
            description="Alert when attendance drops below 75%"
            right={() => <Switch value={notificationsEnabled} onValueChange={(v) => void setNotificationsEnabled(v)} />}
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
                  ? 'Direct fetch — Android only (CORS blocks web)'
                  : 'Proxy through CF Worker — required for Web'
              }
              onPress={() => void setScraperMode(m)}
              right={() =>
                scraperMode === m ? <List.Icon icon="check" color={theme.colors.primary} /> : null
              }
            />
          ))}
          {scraperMode === 'cfworker' ? (
            <TextInput
              label="Worker URL"
              value={workerUrl}
              onChangeText={(v) => void setWorkerUrl(v)}
              placeholder="https://unicc-worker.your-name.workers.dev"
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { padding: 16 },
  input: { marginHorizontal: 16, marginBottom: 8 },
  semCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
});

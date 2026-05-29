import { ScrollView, StyleSheet } from 'react-native';
import { Divider, List, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, SEMESTER_LIST } from '@/store/settings-store';
import type { ScraperMode } from '@/store/settings-store';

export default function PreAuthSettingsScreen() {
  const theme = useTheme();
  const scraperMode = useSettingsStore((s) => s.scraperMode);
  const workerUrl = useSettingsStore((s) => s.workerUrl);
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);
  const setScraperMode = useSettingsStore((s) => s.setScraperMode);
  const setWorkerUrl = useSettingsStore((s) => s.setWorkerUrl);
  const setSelectedSemester = useSettingsStore((s) => s.setSelectedSemester);

  const scraperOptions: { value: ScraperMode; label: string; desc: string }[] = [
    { value: 'cfworker', label: 'Cloudflare Worker', desc: 'Proxy via CF Worker — works on all platforms' },
    { value: 'ondevice', label: 'On-Device', desc: 'Direct fetch — Android only, may have SSL issues' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <List.Section>
          <List.Subheader>Scraper Mode</List.Subheader>
          {scraperOptions.map((opt) => (
            <List.Item
              key={opt.value}
              title={opt.label}
              description={opt.desc}
              onPress={() => void setScraperMode(opt.value)}
              right={() =>
                scraperMode === opt.value ? (
                  <List.Icon icon="check-circle" color={theme.colors.primary} />
                ) : null
              }
            />
          ))}
          {scraperMode === 'cfworker' ? (
            <TextInput
              label="Worker URL"
              value={workerUrl}
              onChangeText={(v) => void setWorkerUrl(v.trim().replace(/\/$/, ''))}
              placeholder="https://unicc-worker.your-name.workers.dev"
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Semester</List.Subheader>
          <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
            Select the semester whose data you want to fetch.
          </Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  input: { marginHorizontal: 16, marginBottom: 8 },
  hint: { marginHorizontal: 16, marginBottom: 4 },
});

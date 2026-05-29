import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Divider, HelperText, List, Snackbar, Switch, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettingsStore, SEMESTER_LIST } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
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

  const vtopCreds = useAuthStore((s) => s.vtopCreds);
  const setVtopCreds = useAuthStore((s) => s.setVtopCreds);
  const clearVtopSession = useAuthStore((s) => s.clearVtopSession);

  const [newUsername, setNewUsername] = useState(vtopCreds?.username ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [credsError, setCredsError] = useState('');

  const themeOptions: ThemePref[] = ['system', 'light', 'dark'];
  const scraperOptions: ScraperMode[] = ['ondevice', 'cfworker'];

  const currentSem = SEMESTER_LIST.find((s) => s.code === selectedSemester);

  async function handleSaveCreds() {
    setCredsError('');
    if (!newUsername.trim()) { setCredsError('Registration number cannot be empty.'); return; }
    if (!newPassword.trim()) { setCredsError('Password cannot be empty.'); return; }
    await setVtopCreds({ username: newUsername.trim(), password: newPassword });
    clearVtopSession();
    setNewPassword('');
    setCredsSaved(true);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView>
        <Text variant="headlineMedium" style={{ padding: 16 }}>Settings</Text>

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 4 }}>
            <TextInput
              label="Registration Number"
              value={newUsername}
              onChangeText={setNewUsername}
              mode="outlined"
              autoCapitalize="characters"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={{ marginBottom: 4 }}
            />
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword((v) => !v)}
                />
              }
              style={{ marginBottom: 4 }}
            />
            {credsError ? <HelperText type="error" visible>{credsError}</HelperText> : null}
            <Button mode="contained-tonal" onPress={handleSaveCreds} icon="content-save">
              Save Credentials
            </Button>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Saving will sign you out of the current session and re-login automatically.
            </Text>
          </View>
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Semester</List.Subheader>
          <View style={{
            marginHorizontal: 16,
            marginBottom: 8,
            padding: 12,
            borderRadius: 8,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: 'rgba(0,0,0,0.12)',
          }}>
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
              style={{ marginBottom: 4 }}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
        </List.Section>
      </ScrollView>

      <Snackbar
        visible={credsSaved}
        onDismiss={() => setCredsSaved(false)}
        duration={3000}
      >
        Credentials saved. Re-login will happen automatically.
      </Snackbar>
    </SafeAreaView>
  );
}

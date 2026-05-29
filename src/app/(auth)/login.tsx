import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Banner, Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useSettingsStore } from '@/store/settings-store';
import { useScraper, useScraperReady } from '@/hooks/use-scraper';

export default function LoginScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [workerInput, setWorkerInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setVtopCreds, setVtopSession } = useAuthStore();
  const setWorkerUrl = useSettingsStore((s) => s.setWorkerUrl);
  const setScraperMode = useSettingsStore((s) => s.setScraperMode);
  const adapter = useScraper();
  const scraperReady = useScraperReady();

  const isWeb = Platform.OS === 'web';

  async function handleSaveWorker() {
    const url = workerInput.trim().replace(/\/$/, '');
    if (!url) return;
    await setWorkerUrl(url);
    await setScraperMode('cfworker');
  }

  async function handleLogin() {
    if (!scraperReady) {
      setError('Set the Cloudflare Worker URL above before signing in.');
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError('Please enter your registration number and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const creds = { username: username.trim(), password };
      const session = await adapter.vtopLogin(creds);
      await setVtopCreds(creds);
      await setVtopSession(session);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center" style={{ marginBottom: 32 }}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
              VIT Portal
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Sign in with your VTOP credentials
            </Text>
          </View>

          {isWeb && !scraperReady && (
            <View style={{ marginBottom: 24, gap: 8 }}>
              <Banner
                visible
                icon="cloud-alert"
                actions={[
                  { label: 'Save', onPress: handleSaveWorker },
                ]}
              >
                Web requires a Cloudflare Worker to bypass CORS. Deploy{' '}
                <Text style={{ fontWeight: 'bold' }}>worker/</Text> then paste the URL:
              </Banner>
              <TextInput
                label="Worker URL"
                value={workerInput}
                onChangeText={setWorkerInput}
                placeholder="https://unicc-worker.your-name.workers.dev"
                mode="outlined"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginBottom: 4 }}
                right={
                  <TextInput.Icon
                    icon="content-save"
                    onPress={handleSaveWorker}
                  />
                }
              />
            </View>
          )}

          <View style={{ gap: 8 }}>
            <TextInput
              label="Registration Number"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="characters"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={{ marginBottom: 4 }}
            />
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
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

            {error ? (
              <HelperText type="error" visible>
                {error}
              </HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || (isWeb && !scraperReady)}
              style={{ marginTop: 16 }}
              contentStyle={{ paddingVertical: 6 }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/settings')}
              style={{ marginTop: 4 }}
              icon="cog"
            >
              Settings
            </Button>

            <Text
              variant="bodySmall"
              style={{ textAlign: 'center', marginTop: 8, lineHeight: 18, color: theme.colors.onSurfaceVariant }}
            >
              {isWeb
                ? 'On web, credentials are sent to your CF Worker and never stored externally.'
                : 'Your credentials are stored securely on this device and never shared.'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

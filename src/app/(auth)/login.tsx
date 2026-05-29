import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';

export default function LoginScreen() {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setVtopCreds, setVtopSession } = useAuthStore();
  const adapter = useScraper();

  async function handleLogin() {
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary }}>
              VIT Portal
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Sign in with your VTOP credentials
            </Text>
          </View>

          <View style={styles.form}>
            <TextInput
              label="Registration Number"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="characters"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
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
              style={styles.input}
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
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>

            <Text
              variant="bodySmall"
              style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
            >
              Your credentials are stored securely on this device and never shared.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  form: { gap: 8 },
  input: { marginBottom: 4 },
  button: { marginTop: 16 },
  buttonContent: { paddingVertical: 6 },
  note: { textAlign: 'center', marginTop: 16, lineHeight: 18 },
});

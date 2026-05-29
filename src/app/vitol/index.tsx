import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useAuthStore } from '@/store/auth-store';
import { useVitolStore } from '@/store/vitol-store';
import type { VitolAssignment } from '@/types/vitol';

function VitolCard({ a }: { a: VitolAssignment }) {
  const theme = useTheme();
  const isOverdue = a.dueDate ? new Date(a.dueDate) < new Date() : false;
  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <Text variant="titleSmall">{a.title}</Text>
        {a.courseName ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{a.courseName}</Text>
        ) : null}
        {a.dueDate && (
          <Text variant="labelSmall" style={{ color: isOverdue ? theme.colors.error : theme.colors.onSurfaceVariant, marginTop: 6 }}>
            Due: {new Date(a.dueDate).toLocaleDateString()}
          </Text>
        )}
        <Text variant="labelSmall" style={{ color: a.completionStatus === 'completed' ? theme.colors.tertiary : theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {a.completionStatus}
        </Text>
      </Card.Content>
    </Card>
  );
}

export default function VitolScreen() {
  const theme = useTheme();
  const adapter = useScraper();
  const { vtopCreds, vitolCreds, setVitolCreds } = useAuthStore();
  const { setAssignments, assignments: cached } = useVitolStore();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['vitol-assignments'],
    queryFn: async () => {
      if (!vtopCreds) throw new Error('Not logged in');
      let creds = vitolCreds;
      if (!creds) {
        creds = await adapter.vitolLogin(vtopCreds);
        await setVitolCreds(creds);
      }
      const assignments = await adapter.fetchVitolAssignments(creds);
      setAssignments(assignments);
      return assignments;
    },
    initialData: cached.length > 0 ? cached : undefined,
    staleTime: 10 * 60 * 1000,
  });

  const assignments = data ?? cached;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load Vitol.'}
        </Banner>
      )}
      {isLoading && assignments.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <VitolCard a={item} />}
          ListHeaderComponent={<Text variant="headlineMedium" style={styles.title}>Vitol</Text>}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No Vitol assignments found.</Text>
          }
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { padding: 16, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  card: { marginHorizontal: 16, marginBottom: 8 },
  empty: { textAlign: 'center', padding: 32 },
});

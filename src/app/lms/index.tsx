import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useAuthStore } from '@/store/auth-store';
import { useLmsStore } from '@/store/lms-store';
import type { LmsAssignment } from '@/types/lms';

function AssignmentCard({ a }: { a: LmsAssignment }) {
  const theme = useTheme();
  const isOverdue = a.dueDate ? new Date(a.dueDate) < new Date() : false;
  const dueColor = isOverdue ? theme.colors.error : theme.colors.onSurfaceVariant;
  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <Text variant="titleSmall">{a.title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {a.courseName}
        </Text>
        <View style={styles.row}>
          {a.dueDate ? (
            <Text variant="labelSmall" style={{ color: dueColor, marginTop: 6 }}>
              Due: {new Date(a.dueDate).toLocaleDateString()}
            </Text>
          ) : (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>No due date</Text>
          )}
          <Chip compact style={{ height: 22 }}>{a.completionStatus}</Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function LmsScreen() {
  const theme = useTheme();
  const adapter = useScraper();
  const { vtopCreds, lmsCreds, setLmsCreds } = useAuthStore();
  const { setAssignments, assignments: cached } = useLmsStore();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['lms-assignments'],
    queryFn: async () => {
      if (!vtopCreds) throw new Error('Not logged in');
      let creds = lmsCreds;
      if (!creds) {
        creds = await adapter.lmsLogin(vtopCreds);
        await setLmsCreds(creds);
      }
      const assignments = await adapter.fetchLmsAssignments(creds);
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
          {error instanceof Error ? error.message : 'Failed to load LMS.'}
        </Banner>
      )}
      {isLoading && assignments.length === 0 ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => <AssignmentCard a={item} />}
          ListHeaderComponent={<Text variant="headlineMedium" style={styles.title}>LMS / Moodle</Text>}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>No assignments found.</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  empty: { textAlign: 'center', padding: 32 },
});

import { FlatList, RefreshControl, View } from 'react-native';
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
    <Card style={{ marginHorizontal: 16, marginBottom: 8 }} mode="elevated">
      <Card.Content>
        <Text variant="titleSmall">{a.title}</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          {a.courseName}
        </Text>
        <View className="flex-row items-center justify-between" style={{ marginTop: 4 }}>
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

  const hasCache = cached.length > 0;

  const { isLoading, isError, error, refetch, isRefetching } = useQuery({
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
    enabled: !hasCache,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const assignments = cached;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      {isError && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : 'Failed to load LMS.'}
        </Banner>
      )}
      {isLoading && assignments.length === 0 ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(a) => String(a.id)}
          renderItem={({ item }) => <AssignmentCard a={item} />}
          ListHeaderComponent={<Text variant="headlineMedium" style={{ padding: 16, paddingBottom: 8 }}>LMS / Moodle</Text>}
          ListEmptyComponent={
            <Text className="text-center p-8" style={{ color: theme.colors.onSurfaceVariant }}>No assignments found.</Text>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[theme.colors.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

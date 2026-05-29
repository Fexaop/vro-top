import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import type { SemesterResult } from '@/types/grades';

function SemCard({ item }: { item: SemesterResult }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall">{item.semesterName}</Text>
          <Chip compact>{`SGPA ${item.sgpa?.toFixed(2) ?? 'N/A'}`}</Chip>
        </View>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
          Credits: {item.totalCredits} · CGPA: {item.cgpa?.toFixed(2) ?? 'N/A'}
        </Text>
        <Divider style={{ marginVertical: 8 }} />
        {item.courses.map((c) => (
          <View key={c.courseCode} style={[styles.row, { marginBottom: 4 }]}>
            <Text variant="bodySmall" style={{ flex: 1, color: colors.onSurfaceVariant }} numberOfLines={1}>
              {c.courseTitle}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{c.grade}</Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

export default function GradesHistory() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const creds = useAuthStore((s) => s.vtopCredentials);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['grades', 'history'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchAllSemesters(session);
    },
    enabled: !!creds,
    staleTime: 10 * 60 * 1000,
  });

  const latestCgpa = data?.find((s) => s.cgpa != null)?.cgpa;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {String(error)}
        </Banner>
      )}
      <View style={styles.header}>
        <Text variant="headlineMedium">Grade History</Text>
        {latestCgpa && <Chip icon="school">{`CGPA ${latestCgpa.toFixed(2)}`}</Chip>}
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.semesterCode}
          renderItem={({ item }) => <SemCard item={item} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { padding: 16, gap: 12 },
  card: { marginBottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

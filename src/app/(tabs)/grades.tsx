import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useGradesStore } from '@/store/grades-store';
import type { CourseGrade } from '@/types/grades';

function gradeColor(grade: string, colors: Record<string, string>): string {
  if (['O', 'S', 'A+'].includes(grade)) return colors.tertiary;
  if (['A', 'B+'].includes(grade)) return colors.primary;
  if (['B', 'C+', 'C'].includes(grade)) return colors.secondary;
  if (['F', 'W', 'N'].includes(grade)) return colors.error;
  return colors.onSurfaceVariant;
}

function GradeCard({ item }: { item: CourseGrade }) {
  const { colors } = useTheme();
  const gc = gradeColor(item.grade, colors as unknown as Record<string, string>);
  const totalScored = item.components.reduce((s, c) => s + (c.markScored ?? 0), 0);
  const totalMax = item.components.reduce((s, c) => s + c.maxMark, 0);

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.courseCode}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Chip
              style={{ backgroundColor: gc + '20' }}
              textStyle={{ color: gc, fontWeight: 'bold' }}
            >
              {item.grade || 'In Progress'}
            </Chip>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {item.credits} cr · GP {item.gradePoint?.toFixed(1) ?? 'N/A'}
            </Text>
          </View>
        </View>
        {totalMax > 0 && (
          <View style={[styles.row, { marginTop: 6 }]}>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              Marks: {totalScored.toFixed(1)} / {totalMax}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {item.components.length} components
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function GradesScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const session = useAuthStore((s) => s.vtopSession);
  const setCurrentGrades = useGradesStore((s) => s.setCurrentGrades);
  const cachedGrades = useGradesStore((s) => s.currentGrades);
  const lastFetched = useGradesStore((s) => s.lastFetchedCurrent);

  const hasCache = cachedGrades.length > 0;

  const { isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['grades', 'current'],
    queryFn: async () => {
      const s = await ensureFreshSession();
      const grades = await scraper.fetchCurrentGrades(s);
      setCurrentGrades(grades);
      return grades;
    },
    enabled: !hasCache,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const data = cachedGrades;
  const cgpa = data.length
    ? (data.reduce((sum, g) => sum + (g.gradePoint ?? 0) * g.credits, 0) /
        Math.max(data.reduce((sum, g) => sum + (g.gradePoint != null ? g.credits : 0), 0), 1)).toFixed(2)
    : null;

  const semCode = session?.semesterCode;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {isError && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : String(error)}
        </Banner>
      )}
      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium">Grades</Text>
          {lastFetched !== null && (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              Updated {new Date(lastFetched).toLocaleTimeString()}
            </Text>
          )}
        </View>
        <View style={styles.row}>
          {cgpa && <Chip icon="school">{`CGPA ${cgpa}`}</Chip>}
          <Button mode="text" onPress={() => router.push('/grades/history')}>History</Button>
        </View>
      </View>
      {semCode && (
        <Button
          mode="outlined"
          style={{ marginHorizontal: 16, marginBottom: 8 }}
          onPress={() => router.push(`/grades/${encodeURIComponent(semCode)}`)}
        >
          View Component-wise Marks
        </Button>
      )}
      {isLoading && !hasCache ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.courseCode}
          renderItem={({ item }) => <GradeCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>No grades data found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { marginBottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', padding: 32 },
});

import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Banner,
  Card,
  Chip,
  Divider,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useGradesStore } from '@/store/grades-store';
import type { CourseGrade, GradeComponent } from '@/types/grades';

function componentBarColor(pct: number, colors: { tertiary: string; primary: string; error: string }): string {
  if (pct >= 0.75) return colors.tertiary;
  if (pct >= 0.5) return colors.primary;
  return colors.error;
}

function gradeColor(grade: string, colors: Record<string, string>): string {
  if (['O', 'S', 'A+'].includes(grade)) return colors.tertiary;
  if (['A', 'B+'].includes(grade)) return colors.primary;
  if (['B', 'C+', 'C'].includes(grade)) return colors.secondary;
  if (['F', 'W', 'N'].includes(grade)) return colors.error;
  return colors.onSurfaceVariant;
}

function ComponentRow({ comp, colors }: { comp: GradeComponent; colors: Record<string, string> }) {
  const pct = comp.markScored != null && comp.maxMark > 0 ? comp.markScored / comp.maxMark : null;
  const barColor = pct != null
    ? componentBarColor(pct, colors as { tertiary: string; primary: string; error: string })
    : colors.outlineVariant;

  return (
    <View style={styles.compRow}>
      <View style={styles.compHeader}>
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, flex: 1 }}>
          {comp.componentName}
        </Text>
        <Text variant="labelSmall" style={{ fontWeight: 'bold', color: colors.onSurface }}>
          {comp.markScored != null ? `${comp.markScored} / ${comp.maxMark}` : `— / ${comp.maxMark}`}
        </Text>
      </View>
      {pct != null && (
        <ProgressBar
          progress={pct}
          color={barColor}
          style={styles.progressBar}
        />
      )}
    </View>
  );
}

function MarksCard({ item }: { item: CourseGrade }) {
  const { colors } = useTheme();
  const gc = gradeColor(item.grade, colors as unknown as Record<string, string>);
  const hasComponents = item.components.length > 0;

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={2}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {item.courseCode} · {item.credits} cr
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {item.grade ? (
              <Chip
                style={{ backgroundColor: gc + '20' }}
                textStyle={{ color: gc, fontWeight: 'bold' }}
              >
                {item.grade}
              </Chip>
            ) : null}
            {item.gradePoint != null && (
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                GP {item.gradePoint.toFixed(1)}
              </Text>
            )}
          </View>
        </View>

        {hasComponents && (
          <>
            <Divider style={{ marginVertical: 10 }} />
            {item.components.map((comp) => (
              <ComponentRow
                key={comp.componentName}
                comp={comp}
                colors={colors as unknown as Record<string, string>}
              />
            ))}
            {item.totalMarks != null && (
              <View style={[styles.row, { marginTop: 6 }]}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                  Total
                </Text>
                <Text variant="labelMedium" style={{ fontWeight: 'bold', color: colors.onSurface }}>
                  {item.totalMarks}
                </Text>
              </View>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

export default function MarksScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {isError && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => void refetch() }]}>
          {error instanceof Error ? error.message : String(error)}
        </Banner>
      )}

      <View style={styles.header}>
        <View>
          <Text variant="headlineMedium">Marks</Text>
          {lastFetched !== null && (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              Updated {new Date(lastFetched).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </View>

      {isLoading && !hasCache ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.courseCode}
          renderItem={({ item }) => <MarksCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>
              No marks data available yet. Marks are published after each assessment.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { marginBottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', padding: 32 },
  compRow: { marginBottom: 8 },
  compHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressBar: { height: 4, borderRadius: 2, marginTop: 4 },
});

import { useQuery } from '@tanstack/react-query';
import { Dimensions, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useGradesStore } from '@/store/grades-store';
import type { SemesterResult } from '@/types/grades';

const SCREEN_W = Dimensions.get('window').width;

function CgpaTrendChart({ semesters }: { semesters: SemesterResult[] }) {
  const { colors } = useTheme();
  const points = semesters
    .filter((s) => s.cgpa != null)
    .map((s) => ({ value: s.cgpa as number, label: s.semesterName.split(' ')[0] ?? '' }));

  if (points.length < 2) return null;

  return (
    <Card mode="outlined" style={styles.chartCard}>
      <Card.Content>
        <Text variant="titleMedium" style={{ marginBottom: 12 }}>CGPA Trend</Text>
        <LineChart
          data={points}
          width={SCREEN_W - 80}
          height={160}
          color={colors.primary}
          dataPointsColor={colors.primary}
          thickness={2}
          startFillColor={colors.primary}
          startOpacity={0.15}
          endOpacity={0.01}
          areaChart
          curved
          hideRules
          yAxisColor="transparent"
          xAxisColor={colors.outlineVariant}
          xAxisLabelTextStyle={{ color: colors.onSurfaceVariant, fontSize: 10 }}
          yAxisTextStyle={{ color: colors.onSurfaceVariant, fontSize: 10 }}
          maxValue={10}
          noOfSections={5}
          initialSpacing={8}
          spacing={(SCREEN_W - 120) / Math.max(points.length - 1, 1)}
        />
      </Card.Content>
    </Card>
  );
}

function SemCard({ item }: { item: SemesterResult }) {
  const { colors } = useTheme();
  return (
    <Card
      style={styles.card}
      mode="outlined"
      onPress={() => router.push(`/grades/${encodeURIComponent(item.semesterCode)}`)}
    >
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall">{item.semesterName}</Text>
          <Chip compact>{`SGPA ${item.sgpa?.toFixed(2) ?? 'N/A'}`}</Chip>
        </View>
        <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
          {`Credits: ${item.totalCredits}  CGPA: ${item.cgpa?.toFixed(2) ?? 'N/A'}`}
        </Text>
        <Divider style={{ marginVertical: 8 }} />
        {item.courses.slice(0, 3).map((c) => (
          <View key={c.courseCode} style={[styles.row, { marginBottom: 4 }]}>
            <Text variant="bodySmall" style={{ flex: 1, color: colors.onSurfaceVariant }} numberOfLines={1}>
              {c.courseTitle}
            </Text>
            <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{c.grade}</Text>
          </View>
        ))}
        {item.courses.length > 3 ? (
          <Text variant="labelSmall" style={{ color: colors.primary, marginTop: 2 }}>
            {`+${item.courses.length - 3} more`}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );
}

export default function GradesHistory() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const setSemesters = useGradesStore((s) => s.setSemesters);
  const cachedSemesters = useGradesStore((s) => s.semesters);
  const lastFetched = useGradesStore((s) => s.lastFetchedHistory);

  const hasCache = cachedSemesters.length > 0;

  const { isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['grades', 'history'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      const sems = await scraper.fetchAllSemesters(session);
      setSemesters(sems);
      return sems;
    },
    enabled: !hasCache,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const data = cachedSemesters;
  const latestCgpa = data.find((s) => s.cgpa != null)?.cgpa;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {isError && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {error instanceof Error ? error.message : String(error)}
        </Banner>
      )}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium">Grade History</Text>
          {lastFetched !== null ? (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {`Updated ${new Date(lastFetched).toLocaleTimeString()}`}
            </Text>
          ) : null}
        </View>
        {latestCgpa != null ? (
          <Chip icon="school">{`CGPA ${latestCgpa.toFixed(2)}`}</Chip>
        ) : null}
      </View>
      {isLoading && !hasCache ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.semesterCode}
          ListHeaderComponent={data.length > 1 ? <CgpaTrendChart semesters={data} /> : null}
          renderItem={({ item }) => <SemCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>No grade history found.</Text>
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
  chartCard: { marginBottom: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', padding: 32 },
});

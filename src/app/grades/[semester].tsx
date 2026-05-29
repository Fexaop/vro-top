import { useQuery } from '@tanstack/react-query';
import { SectionList, StyleSheet, View, RefreshControl } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Divider, ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
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

function CourseCard({ course, isCurrent }: { course: CourseGrade; isCurrent: boolean }) {
  const { colors } = useTheme();
  const gc = gradeColor(course.grade, colors as unknown as Record<string, string>);

  return (
    <Card mode="outlined" style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={2}>{course.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{course.courseCode}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {course.grade ? (
              <Chip style={{ backgroundColor: gc + '20' }} textStyle={{ color: gc, fontWeight: 'bold' }}>
                {course.grade}
              </Chip>
            ) : null}
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {course.credits} cr · GP {course.gradePoint?.toFixed(1) ?? 'N/A'}
            </Text>
          </View>
        </View>

        {isCurrent && course.components.length > 0 && (
          <>
            <Divider style={{ marginVertical: 10 }} />
            {course.components.map((comp) => {
              const pct = comp.markScored != null ? comp.markScored / comp.maxMark : null;
              return (
                <View key={comp.componentName} style={{ marginBottom: 8 }}>
                  <View style={styles.row}>
                    <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                      {comp.componentName}
                    </Text>
                    <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>
                      {comp.markScored != null ? `${comp.markScored} / ${comp.maxMark}` : `— / ${comp.maxMark}`}
                    </Text>
                  </View>
                  {pct != null && (
                    <ProgressBar
                      progress={pct}
                      color={pct >= 0.75 ? colors.tertiary : pct >= 0.5 ? colors.primary : colors.error}
                      style={{ height: 4, borderRadius: 2, marginTop: 4 }}
                    />
                  )}
                </View>
              );
            })}
            {course.totalMarks != null && (
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Total</Text>
                <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>{course.totalMarks}</Text>
              </View>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

export default function SemesterDetail() {
  const { semester } = useLocalSearchParams<{ semester: string }>();
  const semCode = decodeURIComponent(semester ?? '');
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const session = useAuthStore((s) => s.vtopSession);

  const cachedSemesters = useGradesStore((s) => s.semesters);
  const cachedCurrentGrades = useGradesStore((s) => s.currentGrades);
  const setCurrentGrades = useGradesStore((s) => s.setCurrentGrades);
  const setSemesters = useGradesStore((s) => s.setSemesters);

  const isCurrent = session?.semesterCode === semCode;
  const hasHistoryCache = cachedSemesters.length > 0;
  const hasCurrentCache = cachedCurrentGrades.length > 0;

  const { isLoading: histLoading, error: histError, refetch: refetchHist, isRefetching: histRefetching } = useQuery({
    queryKey: ['grades', 'history'],
    queryFn: async () => {
      const s = await ensureFreshSession();
      const sems = await scraper.fetchAllSemesters(s);
      setSemesters(sems);
      return sems;
    },
    enabled: !hasHistoryCache,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const { isLoading: currLoading, error: currError, refetch: refetchCurr, isRefetching: currRefetching } = useQuery({
    queryKey: ['grades', 'current'],
    queryFn: async () => {
      const s = await ensureFreshSession();
      const grades = await scraper.fetchCurrentGrades(s);
      setCurrentGrades(grades);
      return grades;
    },
    enabled: !hasCurrentCache && isCurrent,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const semesterResult = cachedSemesters.find((s) => s.semesterCode === semCode);
  const isLoading = histLoading || (isCurrent && currLoading);
  const isRefreshing = histRefetching || currRefetching;
  const error = histError ?? currError;

  const coursesToShow: CourseGrade[] = isCurrent && cachedCurrentGrades.length > 0
    ? cachedCurrentGrades
    : semesterResult?.courses ?? [];

  const sgpa = semesterResult?.sgpa;
  const cgpa = semesterResult?.cgpa;
  const totalCredits = semesterResult?.totalCredits ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => { void refetchHist(); void refetchCurr(); } }]}>
          {error instanceof Error ? error.message : String(error)}
        </Banner>
      )}

      {isLoading && coursesToShow.length === 0 ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <SectionList
          sections={[{ title: '', data: coursesToShow }]}
          keyExtractor={(item) => item.courseCode}
          renderItem={({ item }) => <CourseCard course={item} isCurrent={isCurrent} />}
          renderSectionHeader={() => (
            <View style={[styles.summaryRow, { backgroundColor: colors.background }]}>
              <Text variant="headlineSmall" style={{ flex: 1 }} numberOfLines={1}>
                {semesterResult?.semesterName ?? semCode}
              </Text>
            </View>
          )}
          ListHeaderComponent={
            semesterResult ? (
              <View style={[styles.statsRow, { backgroundColor: colors.surfaceVariant, borderRadius: 12, padding: 16, margin: 16 }]}>
                <View style={styles.stat}>
                  <Text variant="headlineSmall" style={{ color: colors.primary }}>{sgpa?.toFixed(2) ?? 'N/A'}</Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>SGPA</Text>
                </View>
                <View style={[styles.stat, { borderLeftWidth: 1, borderColor: colors.outline }]}>
                  <Text variant="headlineSmall" style={{ color: colors.secondary }}>{cgpa?.toFixed(2) ?? 'N/A'}</Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>CGPA</Text>
                </View>
                <View style={[styles.stat, { borderLeftWidth: 1, borderColor: colors.outline }]}>
                  <Text variant="headlineSmall">{totalCredits}</Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>Credits</Text>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { void refetchHist(); void refetchCurr(); }}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { paddingBottom: 32 },
  card: { marginHorizontal: 16, marginBottom: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { paddingHorizontal: 16, paddingVertical: 8 },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
});

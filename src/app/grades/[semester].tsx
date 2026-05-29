import { useQuery } from '@tanstack/react-query';
import { SectionList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Card, Chip, Divider, ProgressBar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
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
              <Chip
                style={{ backgroundColor: gc + '20' }}
                textStyle={{ color: gc, fontWeight: 'bold' }}
              >
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
  const creds = useAuthStore((s) => s.vtopCredentials);
  const session = useAuthStore((s) => s.vtopSession);

  const isCurrent = session?.semesterCode === semCode;

  const { data: historyData, isLoading: histLoading, error: histError, refetch: refetchHist } = useQuery({
    queryKey: ['grades', 'history'],
    queryFn: async () => {
      const s = await ensureFreshSession();
      return scraper.fetchAllSemesters(s);
    },
    enabled: !!creds,
    staleTime: 10 * 60 * 1000,
  });

  const { data: currentData, isLoading: currLoading, error: currError, refetch: refetchCurr } = useQuery({
    queryKey: ['grades', 'current'],
    queryFn: async () => {
      const s = await ensureFreshSession();
      return scraper.fetchCurrentGrades(s);
    },
    enabled: !!creds && isCurrent,
    staleTime: 5 * 60 * 1000,
  });

  const semesterResult = historyData?.find((s) => s.semesterCode === semCode);
  const isLoading = histLoading || (isCurrent && currLoading);
  const error = histError ?? currError;

  const coursesToShow: CourseGrade[] = isCurrent && currentData
    ? currentData
    : semesterResult?.courses ?? [];

  const sgpa = semesterResult?.sgpa;
  const cgpa = semesterResult?.cgpa;
  const totalCredits = semesterResult?.totalCredits ?? 0;

  const sections = [{ title: '', data: coursesToShow }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => { void refetchHist(); void refetchCurr(); } }]}>
          {String(error)}
        </Banner>
      )}

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <SectionList
          sections={sections}
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
                  <Text variant="headlineSmall" style={{ color: colors.primary }}>
                    {sgpa?.toFixed(2) ?? 'N/A'}
                  </Text>
                  <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>SGPA</Text>
                </View>
                <View style={[styles.stat, { borderLeftWidth: 1, borderColor: colors.outline }]}>
                  <Text variant="headlineSmall" style={{ color: colors.secondary }}>
                    {cgpa?.toFixed(2) ?? 'N/A'}
                  </Text>
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
          onRefresh={() => { void refetchHist(); void refetchCurr(); }}
          refreshing={isLoading}
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

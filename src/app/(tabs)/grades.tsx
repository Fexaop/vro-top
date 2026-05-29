import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, View } from 'react-native';
import { ActivityIndicator, Banner, Button, Card, Chip, IconButton, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useGradesStore } from '@/store/grades-store';
import { useSettingsStore } from '@/store/settings-store';
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
  const gc = gradeColor(item.grade ?? '', colors as unknown as Record<string, string>);
  const totalScored = item.components.reduce((s, c) => s + (c.markScored ?? 0), 0);
  const totalMax = item.components.reduce((s, c) => s + c.maxMark, 0);
  const gradeLabel = item.grade ? item.grade : 'In Progress';

  return (
    <Card style={{ marginBottom: 0 }} mode="outlined">
      <Card.Content>
        <View className="flex-row items-center justify-between gap-2">
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.courseCode}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Chip
              style={{ backgroundColor: gc + '20' }}
              textStyle={{ color: gc, fontWeight: 'bold' }}
            >
              {gradeLabel}
            </Chip>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {item.gradePoint != null && item.gradePoint > 0
                ? `${item.credits} cr · GP ${item.gradePoint.toFixed(1)}`
                : `${item.credits} cr`}
            </Text>
          </View>
        </View>
        {totalMax > 0 ? (
          <View className="flex-row items-center justify-between gap-2" style={{ marginTop: 6 }}>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {`Marks: ${totalScored.toFixed(1)} / ${totalMax}`}
            </Text>
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {`${item.components.length} components`}
            </Text>
          </View>
        ) : null}
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
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['grades', 'current', selectedSemester],
    queryFn: async () => {
      const s = await ensureFreshSession();
      const grades = await scraper.fetchCurrentGrades(s);
      setCurrentGrades(grades);
      return grades;
    },
    staleTime: 5 * 60 * 1000,
  });

  const displayData = data ?? cachedGrades;
  const hasData = displayData.length > 0;
  const graded = displayData.filter((g) => g.gradePoint != null && g.gradePoint > 0);
  const gradedCredits = graded.reduce((sum, g) => sum + g.credits, 0);
  const cgpa = gradedCredits > 0
    ? (graded.reduce((sum, g) => sum + g.gradePoint! * g.credits, 0) / gradedCredits).toFixed(2)
    : null;

  const semCode = session?.semesterCode ?? null;
  const lastUpdatedStr = lastFetched !== null ? new Date(lastFetched).toLocaleTimeString() : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      {isError ? (
        <Banner visible actions={[{ label: 'Retry', onPress: () => void refetch() }]}>
          {error instanceof Error ? error.message : String(error)}
        </Banner>
      ) : null}
      <View className="flex-row items-center justify-between p-4">
        <View style={{ flex: 1 }}>
          <Text variant="headlineMedium">Grades</Text>
          {lastUpdatedStr !== null ? (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {`Updated ${lastUpdatedStr}`}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1">
          {cgpa != null ? (
            <Chip icon="school">{`CGPA ${cgpa}`}</Chip>
          ) : null}
          <IconButton
            icon="refresh"
            size={20}
            onPress={() => void refetch()}
            iconColor={colors.primary}
          />
          <Button mode="text" onPress={() => router.push('/grades/history')}>History</Button>
        </View>
      </View>
      {semCode != null ? (
        <Button
          mode="outlined"
          style={{ marginHorizontal: 16, marginBottom: 8 }}
          onPress={() => router.push(`/grades/${encodeURIComponent(semCode)}`)}
        >
          View Marks Breakdown
        </Button>
      ) : null}
      {isLoading && !hasData ? (
        <View className="flex-1 justify-center items-center"><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(i, idx) => `${i.courseCode}-${idx}`}
          renderItem={({ item }) => <GradeCard item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <Text className="text-center p-8" style={{ color: colors.onSurfaceVariant }}>No grades data found.</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

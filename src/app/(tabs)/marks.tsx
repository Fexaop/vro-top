import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, View } from 'react-native';
import {
  ActivityIndicator,
  Banner,
  Card,
  Chip,
  Divider,
  IconButton,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useGradesStore } from '@/store/grades-store';
import { useSettingsStore } from '@/store/settings-store';
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
  const scoreLabel = comp.markScored != null
    ? `${comp.markScored} / ${comp.maxMark}`
    : `— / ${comp.maxMark}`;

  return (
    <View className="mb-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, flex: 1 }}>
          {comp.componentName}
        </Text>
        <Text variant="labelSmall" style={{ fontWeight: 'bold', color: colors.onSurface }}>
          {scoreLabel}
        </Text>
      </View>
      {pct != null ? (
        <ProgressBar
          progress={pct}
          color={barColor}
          style={{ height: 4, borderRadius: 2, marginTop: 4 }}
        />
      ) : null}
    </View>
  );
}

function MarksCard({ item }: { item: CourseGrade }) {
  const { colors } = useTheme();
  const gc = gradeColor(item.grade ?? '', colors as unknown as Record<string, string>);
  const hasComponents = item.components.length > 0;
  const courseInfo = `${item.courseCode} · ${item.credits} cr`;
  const gpLabel = item.gradePoint != null && item.gradePoint > 0 ? `GP ${item.gradePoint.toFixed(1)}` : null;

  return (
    <Card style={{ marginBottom: 0 }} mode="outlined">
      <Card.Content>
        <View className="flex-row items-center justify-between gap-2">
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={2}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {courseInfo}
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
            {gpLabel !== null ? (
              <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                {gpLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {hasComponents ? (
          <>
            <Divider style={{ marginVertical: 10 }} />
            {item.components.map((comp, i) => (
              <ComponentRow
                key={`${comp.componentName}-${i}`}
                comp={comp}
                colors={colors as unknown as Record<string, string>}
              />
            ))}
            {item.totalMarks != null ? (
              <View className="flex-row items-center justify-between gap-2" style={{ marginTop: 6 }}>
                <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
                  Total
                </Text>
                <Text variant="labelMedium" style={{ fontWeight: 'bold', color: colors.onSurface }}>
                  {`${item.totalMarks}`}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
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
          <Text variant="headlineMedium">Marks</Text>
          {lastUpdatedStr !== null ? (
            <Text variant="labelSmall" style={{ color: colors.onSurfaceVariant }}>
              {`Last updated ${lastUpdatedStr}`}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon="refresh"
          size={20}
          onPress={() => void refetch()}
          iconColor={colors.primary}
        />
      </View>

      {isLoading && !hasData ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item, index) => `${item.courseCode}-${index}`}
          renderItem={({ item }) => <MarksCard item={item} />}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <Text className="text-center p-8" style={{ color: colors.onSurfaceVariant }}>
              No marks data available yet. Marks are published after each assessment.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

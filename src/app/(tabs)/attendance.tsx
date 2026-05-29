import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useAttendanceStore } from '@/store/attendance-store';
import { useSettingsStore } from '@/store/settings-store';
import { AttendanceCard } from '@/components/ui/attendance-card';
import type { AttendanceCourse } from '@/types/attendance';

export default function AttendanceScreen() {
  const theme = useTheme();
  const adapter = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const setCourses = useAttendanceStore((s) => s.setCourses);
  const cachedCourses = useAttendanceStore((s) => s.courses);
  const lastFetched = useAttendanceStore((s) => s.lastFetched);
  const selectedSemester = useSettingsStore((s) => s.selectedSemester);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['attendance', selectedSemester],
    queryFn: async () => {
      const session = await ensureFreshSession();
      const courses = await adapter.fetchAttendance(session);
      setCourses(courses);
      return courses;
    },
    staleTime: 5 * 60 * 1000,
  });

  const courses = (data ?? cachedCourses).slice().sort((a, b) => a.percentage - b.percentage);
  const hasData = courses.length > 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      {isError && (
        <Banner
          visible
          icon="alert-circle"
          actions={[{ label: 'Retry', onPress: () => refetch() }]}
        >
          {error instanceof Error ? error.message : 'Failed to load attendance.'}
        </Banner>
      )}

      {isLoading && !hasData ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading attendance…
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(c) => c.courseCode}
          renderItem={({ item }) => (
            <AttendanceCard course={item} onPress={() => router.push(`/attendance/${encodeURIComponent(item.courseCode)}`)} />
          )}
          ListHeaderComponent={
            <View style={styles.titleRow}>
              <Text variant="headlineMedium">Attendance</Text>
              {lastFetched !== null ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {`Updated ${new Date(lastFetched).toLocaleTimeString()}`}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              No attendance data found.
            </Text>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => refetch()}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', padding: 32 },
});

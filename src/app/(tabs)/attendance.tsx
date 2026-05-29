import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useAttendanceStore } from '@/store/attendance-store';
import { AttendanceCard } from '@/components/ui/attendance-card';
import type { AttendanceCourse } from '@/types/attendance';

export default function AttendanceScreen() {
  const theme = useTheme();
  const adapter = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const setCourses = useAttendanceStore((s) => s.setCourses);
  const cachedCourses = useAttendanceStore((s) => s.courses);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      const courses = await adapter.fetchAttendance(session);
      setCourses(courses);
      return courses;
    },
    initialData: cachedCourses.length > 0 ? cachedCourses : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const courses = (data ?? cachedCourses).sort((a, b) => a.percentage - b.percentage);

  function navigateToCourse(course: AttendanceCourse) {
    router.push(`/attendance/${encodeURIComponent(course.courseCode)}`);
  }

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

      {isLoading && courses.length === 0 ? (
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
            <AttendanceCard course={item} onPress={() => navigateToCourse(item)} />
          )}
          ListHeaderComponent={
            <Text variant="headlineMedium" style={styles.title}>
              Attendance
            </Text>
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
              onRefresh={refetch}
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
  title: { padding: 16, paddingBottom: 8 },
  list: { paddingBottom: 24 },
  empty: { textAlign: 'center', padding: 32 },
});

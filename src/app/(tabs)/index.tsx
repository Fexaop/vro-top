import { useQuery } from '@tanstack/react-query';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import { useBackgroundTask } from '@/hooks/use-background-task';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const creds = useAuthStore((s) => s.vtopCreds);
  useBackgroundTask();

  const { data: attendance, isLoading: attLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchAttendance(session);
    },
    enabled: !!creds,
    staleTime: 5 * 60 * 1000,
  });

  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['grades', 'current'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchCurrentGrades(session);
    },
    enabled: !!creds,
    staleTime: 5 * 60 * 1000,
  });

  const { data: exams, isLoading: examLoading } = useQuery({
    queryKey: ['exam-schedule'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchExamSchedule(session);
    },
    enabled: !!creds,
    staleTime: 30 * 60 * 1000,
  });

  const lowAtt = attendance?.filter((c) => c.percentage < 75) ?? [];
  const overallAtt = attendance?.length
    ? (attendance.reduce((s, c) => s + c.percentage, 0) / attendance.length).toFixed(1)
    : null;
  const cgpa = grades?.length
    ? (grades.reduce((s, g) => s + (g.gradePoint ?? 0) * g.credits, 0) /
        Math.max(grades.reduce((s, g) => s + (g.gradePoint != null ? g.credits : 0), 0), 1)).toFixed(2)
    : null;
  const nextExam = exams?.filter((e) => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Dashboard</Text>

        <View style={styles.statsRow}>
          <Card mode="elevated" style={[styles.statCard, { backgroundColor: colors.primaryContainer }]} onPress={() => router.push('/(tabs)/attendance')}>
            <Card.Content style={styles.statContent}>
              {attLoading ? <ActivityIndicator /> : (
                <>
                  <Text variant="displaySmall" style={{ color: colors.onPrimaryContainer }}>{`${overallAtt ?? '--'}%`}</Text>
                  <Text variant="labelMedium" style={{ color: colors.onPrimaryContainer }}>Attendance</Text>
                </>
              )}
            </Card.Content>
          </Card>
          <Card mode="elevated" style={[styles.statCard, { backgroundColor: colors.secondaryContainer }]} onPress={() => router.push('/(tabs)/grades')}>
            <Card.Content style={styles.statContent}>
              {gradesLoading ? <ActivityIndicator /> : (
                <>
                  <Text variant="displaySmall" style={{ color: colors.onSecondaryContainer }}>{cgpa ?? '--'}</Text>
                  <Text variant="labelMedium" style={{ color: colors.onSecondaryContainer }}>CGPA</Text>
                </>
              )}
            </Card.Content>
          </Card>
        </View>

        {lowAtt.length > 0 ? (
          <Card mode="outlined" style={[styles.card, { borderColor: colors.error }]} onPress={() => router.push('/(tabs)/attendance')}>
            <Card.Content>
              <Text variant="titleSmall" style={{ color: colors.error }}>Low Attendance Warning</Text>
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
                {lowAtt.map((c) => `${c.courseCode} (${c.percentage.toFixed(1)}%)`).join(', ')}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        {nextExam != null ? (
          <Card mode="outlined" style={styles.card} onPress={() => router.push('/(tabs)/exam')}>
            <Card.Content>
              <Text variant="titleSmall">Next Exam</Text>
              <Divider style={{ marginVertical: 6 }} />
              <Text variant="bodyMedium">{nextExam.courseTitle}</Text>
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {`${nextExam.date} · ${nextExam.session}`}
                </Text>
                {nextExam.seatNumber ? (
                  <Chip compact>{`Seat ${nextExam.seatNumber}`}</Chip>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <Text variant="titleMedium" style={{ marginTop: 16, marginBottom: 8 }}>Quick Access</Text>
        <View style={styles.grid}>
          {[
            { label: 'Exam Schedule', route: '/(tabs)/exam', icon: 'file-document' },
            { label: 'Calendar', route: '/(tabs)/calendar', icon: 'calendar' },
            { label: 'Hostel', route: '/(tabs)/hostel', icon: 'home' },
            { label: 'LMS', route: '/(tabs)/lms', icon: 'book-open' },
            { label: 'Settings', route: '/(tabs)/settings', icon: 'cog' },
          ].map(({ label, route }) => (
            <Card key={label} mode="outlined" style={styles.gridCard} onPress={() => router.push(route as never)}>
              <Card.Content style={styles.statContent}>
                <Text variant="labelLarge">{label}</Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16 },
  title: { marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1 },
  statContent: { alignItems: 'center', paddingVertical: 16 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: { width: '47%' },
});

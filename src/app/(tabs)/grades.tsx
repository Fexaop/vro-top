import { useQuery } from '@tanstack/react-query';
import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Button, Card, Chip, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useScraper } from '@/hooks/use-scraper';
import { useVtopSession } from '@/hooks/use-vtop-session';
import type { CourseGrade } from '@/types/grades';

function gradeColor(grade: string, colors: Record<string, string>): string {
  if (['O', 'A+'].includes(grade)) return colors.tertiary;
  if (['A', 'B+'].includes(grade)) return colors.primary;
  if (['B', 'C'].includes(grade)) return colors.secondary;
  if (['F', 'N'].includes(grade)) return colors.error;
  return colors.onSurfaceVariant;
}

function GradeCard({ item }: { item: CourseGrade }) {
  const { colors } = useTheme();
  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" numberOfLines={1}>{item.courseTitle}</Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>{item.courseCode}</Text>
          </View>
          <Chip
            style={{ backgroundColor: gradeColor(item.grade, colors as unknown as Record<string, string>) + '20' }}
            textStyle={{ color: gradeColor(item.grade, colors as unknown as Record<string, string>), fontWeight: 'bold' }}
          >
            {item.grade || 'N/A'}
          </Chip>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Credits: {item.credits}</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>GPA: {item.gradePoint ?? 'N/A'}</Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>Marks: {item.totalMarks != null ? item.totalMarks : 'N/A'}</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function GradesScreen() {
  const { colors } = useTheme();
  const scraper = useScraper();
  const { ensureFreshSession } = useVtopSession();
  const creds = useAuthStore((s) => s.vtopCredentials);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['grades', 'current'],
    queryFn: async () => {
      const session = await ensureFreshSession();
      return scraper.fetchCurrentGrades(session);
    },
    enabled: !!creds,
    staleTime: 5 * 60 * 1000,
  });

  const cgpa = data?.length
    ? (data.reduce((sum, g) => sum + (g.gradePoint ?? 0) * g.credits, 0) /
        data.reduce((sum, g) => sum + (g.gradePoint != null ? g.credits : 0), 0)).toFixed(2)
    : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {error && (
        <Banner visible actions={[{ label: 'Retry', onPress: () => refetch() }]}>
          {String(error)}
        </Banner>
      )}
      <View style={styles.header}>
        <Text variant="headlineMedium">Grades</Text>
        <View style={styles.row}>
          {cgpa && <Chip icon="school">{`CGPA ${cgpa}`}</Chip>}
          <Button mode="text" onPress={() => router.push('/grades/history')}>History</Button>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.courseCode}
          renderItem={({ item }) => <GradeCard item={item} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  list: { padding: 16, gap: 12 },
  card: { marginBottom: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

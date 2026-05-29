import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState } from 'react';
import { useAttendanceStore } from '@/store/attendance-store';
import { useAttendancePredictor } from '@/hooks/use-attendance-predictor';

export default function CourseDetail() {
  const { courseCode } = useLocalSearchParams<{ courseCode: string }>();
  const theme = useTheme();
  const courses = useAttendanceStore((s) => s.courses);
  const decoded = decodeURIComponent(courseCode ?? '');
  const course = courses.find((c) => c.courseCode === decoded);
  const predictions = useAttendancePredictor(course ? [course] : []);
  const pred = predictions[0];
  const [extra, setExtra] = useState(0);

  if (!course || !pred) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
        <View style={styles.center}>
          <Text variant="bodyLarge">Course not found.</Text>
          <Button onPress={() => router.back()} style={{ marginTop: 16 }}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isLow = course.percentage < 75;
  const statColor = isLow ? theme.colors.error : theme.colors.tertiary;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Button
          icon="arrow-left"
          onPress={() => router.back()}
          style={styles.back}
          compact
        >
          Back
        </Button>

        <Text variant="headlineMedium" style={styles.title}>
          {course.courseTitle}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {course.courseCode} · {course.slot}
        </Text>
        {course.faculty ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            {course.faculty}
          </Text>
        ) : null}

        <Divider style={styles.divider} />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text variant="displaySmall" style={{ color: statColor }}>
              {course.percentage}%
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Attendance
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text variant="headlineMedium">{course.attended}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Present
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text variant="headlineMedium">{course.totalClasses - course.attended}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Absent
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text variant="headlineMedium">{course.totalClasses}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Predictor */}
        <Card style={styles.card}>
          <Card.Title title="Attendance Predictor" subtitle="Target: 75%" />
          <Card.Content>
            {pred.canBunkCount > 0 ? (
              <Text variant="bodyLarge" style={{ color: theme.colors.tertiary }}>
                You can miss {pred.canBunkCount} more class{pred.canBunkCount !== 1 ? 'es' : ''}{' '}
                and stay above 75%.
              </Text>
            ) : pred.needAttendCount > 0 ? (
              <Text variant="bodyLarge" style={{ color: theme.colors.error }}>
                You need to attend {pred.needAttendCount} consecutive class
                {pred.needAttendCount !== 1 ? 'es' : ''} to reach 75%.
              </Text>
            ) : (
              <Text variant="bodyLarge">You are exactly at 75%.</Text>
            )}

            <Divider style={{ marginVertical: 12 }} />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
              Simulate attending extra classes:
            </Text>
            <View style={styles.chipRow}>
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <Chip
                  key={n}
                  selected={extra === n}
                  onPress={() => setExtra(n)}
                  style={styles.chip}
                >
                  +{n}
                </Chip>
              ))}
            </View>
            {extra > 0 && (
              <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                After attending {extra} more: {pred.projectedAt(extra)}%
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  container: { padding: 16, paddingBottom: 32 },
  back: { alignSelf: 'flex-start', marginBottom: 12, marginLeft: -8 },
  title: { marginBottom: 4 },
  divider: { marginVertical: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center' },
  card: { marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
});

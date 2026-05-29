import { ScrollView, View } from 'react-native';
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
      <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
        <View className="flex-1 items-center justify-center p-6">
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
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Button
          icon="arrow-left"
          onPress={() => router.back()}
          style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: -8 }}
          compact
        >
          Back
        </Button>

        <Text variant="headlineMedium" style={{ marginBottom: 4 }}>
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

        <Divider style={{ marginVertical: 16 }} />

        {/* Stats row */}
        <View className="flex-row justify-around">
          <View className="items-center">
            <Text variant="displaySmall" style={{ color: statColor }}>
              {course.percentage}%
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Attendance
            </Text>
          </View>
          <View className="items-center">
            <Text variant="headlineMedium">{course.attended}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Present
            </Text>
          </View>
          <View className="items-center">
            <Text variant="headlineMedium">{course.totalClasses - course.attended}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Absent
            </Text>
          </View>
          <View className="items-center">
            <Text variant="headlineMedium">{course.totalClasses}</Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Total
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 16 }} />

        {/* Predictor */}
        <Card style={{ marginBottom: 16 }}>
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
            <View className="flex-row flex-wrap gap-2">
              {[0, 1, 2, 3, 5, 10].map((n) => (
                <Chip
                  key={n}
                  selected={extra === n}
                  onPress={() => setExtra(n)}
                  style={{ marginBottom: 4 }}
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

import { View } from 'react-native';
import { Card, ProgressBar, Text, useTheme } from 'react-native-paper';
import type { AttendanceCourse } from '@/types/attendance';

interface Props {
  course: AttendanceCourse;
  onPress?: () => void;
}

export function AttendanceCard({ course, onPress }: Props) {
  const theme = useTheme();
  const pct = course.percentage;
  const isLow = pct < 75;
  const isBorder = pct >= 75 && pct < 85;

  const barColor = isLow
    ? theme.colors.error
    : isBorder
      ? '#F5A623'
      : theme.colors.tertiary;

  return (
    <Card style={{ marginHorizontal: 16, marginBottom: 8 }} onPress={onPress} mode="elevated">
      <Card.Content>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text variant="titleSmall" numberOfLines={1}>
              {course.courseTitle}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {course.courseCode} · {course.slot}
            </Text>
          </View>
          <Text
            variant="headlineSmall"
            style={{ color: barColor, fontVariant: ['tabular-nums'] }}
          >
            {`${pct}%`}
          </Text>
        </View>

        <ProgressBar
          progress={pct / 100}
          color={barColor}
          style={{ marginTop: 10, height: 6, borderRadius: 3 }}
        />

        <View className="flex-row justify-between" style={{ marginTop: 6 }}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {course.attended}/{course.totalClasses} classes
          </Text>
          {course.faculty ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
              numberOfLines={1}
            >
              {course.faculty.split(' ')[0] ?? ''}
            </Text>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

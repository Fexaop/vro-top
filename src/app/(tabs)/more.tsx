import { ScrollView } from 'react-native';
import { Card, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const SECTIONS = [
  { label: 'Marks', icon: 'clipboard-text', href: '/(tabs)/marks' },
  { label: 'Exam Schedule', icon: 'clipboard-list', href: '/(tabs)/exam' },
  { label: 'Academic Calendar', icon: 'calendar', href: '/(tabs)/calendar' },
  { label: 'Hostel', icon: 'home-city', href: '/(tabs)/hostel' },
  { label: 'LMS / Moodle', icon: 'book-open-variant', href: '/(tabs)/lms' },
  { label: 'Settings', icon: 'cog', href: '/(tabs)/settings' },
] as const;

export default function MoreScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 16 }}>
          More
        </Text>
        {SECTIONS.map((s) => (
          <Card
            key={s.href}
            style={{ marginBottom: 8 }}
            onPress={() => router.push(s.href as never)}
          >
            <Card.Title
              title={s.label}
              left={(props) => {
                const MaterialCommunityIcons =
                  // eslint-disable-next-line @typescript-eslint/no-require-imports
                  require('@expo/vector-icons').MaterialCommunityIcons as React.ComponentType<{
                    name: string;
                    size: number;
                    color: string;
                  }>;
                return (
                  <MaterialCommunityIcons
                    name={s.icon}
                    size={props.size}
                    color={theme.colors.primary}
                  />
                );
              }}
            />
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

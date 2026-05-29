import { ScrollView, View } from 'react-native';
import { Card, Chip, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEALS = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const;

const MENU: Record<string, Record<typeof MEALS[number], string>> = {
  Monday: { Breakfast: 'Idli, Sambar, Chutney', Lunch: 'Rice, Dal, Sabzi, Chapati', Snacks: 'Bread Omelette', Dinner: 'Chapati, Paneer, Dal' },
  Tuesday: { Breakfast: 'Poha, Tea', Lunch: 'Rice, Sambar, Papad', Snacks: 'Vada Pav', Dinner: 'Roti, Mix Veg, Curd' },
  Wednesday: { Breakfast: 'Upma, Chutney', Lunch: 'Rice, Rajma, Chapati', Snacks: 'Samosa', Dinner: 'Chapati, Egg Curry, Rice' },
  Thursday: { Breakfast: 'Dosa, Sambar', Lunch: 'Chole, Rice, Chapati', Snacks: 'Bread Butter', Dinner: 'Roti, Dal Makhani' },
  Friday: { Breakfast: 'Paratha, Curd', Lunch: 'Rice, Fish Curry, Chapati', Snacks: 'Biscuits', Dinner: 'Chapati, Aloo Gobi, Dal' },
  Saturday: { Breakfast: 'Puri Bhaji', Lunch: 'Biryani, Raita', Snacks: 'Fried Rice', Dinner: 'Chapati, Paneer, Dal' },
  Sunday: { Breakfast: 'Idli, Vada, Sambar', Lunch: 'Special Thali', Snacks: 'Snacks', Dinner: 'Chapati, Sabzi, Ice Cream' },
};

export default function MessScreen() {
  const { colors } = useTheme();
  const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 12 }}>Mess Menu</Text>
        <Chip icon="calendar-today" style={{ alignSelf: 'flex-start', marginBottom: 16 }}>Today: {today}</Chip>

        {DAYS.map((day) => (
          <Card key={day} mode={day === today ? 'elevated' : 'outlined'} style={{ marginBottom: 12 }}>
            <Card.Content>
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="titleMedium">{day}</Text>
                {day === today && <Chip compact>Today</Chip>}
              </View>
              <Divider style={{ marginVertical: 8 }} />
              {MEALS.map((meal) => (
                <View key={meal} className="flex-row items-center justify-between gap-2" style={{ marginBottom: 4 }}>
                  <Text variant="labelMedium" style={{ color: colors.onSurfaceVariant, width: 80 }}>{meal}</Text>
                  <Text variant="bodySmall" style={{ flex: 1, color: colors.onSurface }}>{MENU[day][meal]}</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

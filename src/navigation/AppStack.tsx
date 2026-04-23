import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { HomeScreen } from '@/screens/home/HomeScreen';
import { colors } from '@/theme/colors';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: 'Telemedicina' }}
      />
    </Stack.Navigator>
  );
}

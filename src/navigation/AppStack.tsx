import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ChatScreen } from '@/screens/consultation/ChatScreen';
import { RequestConsultationScreen } from '@/screens/consultation/RequestConsultationScreen';
import { WaitingRoomScreen } from '@/screens/consultation/WaitingRoomScreen';
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
      <Stack.Screen
        name="RequestConsultation"
        component={RequestConsultationScreen}
        options={{ title: 'Nueva consulta' }}
      />
      <Stack.Screen
        name="WaitingRoom"
        component={WaitingRoomScreen}
        options={{ title: 'Sala de espera', headerBackVisible: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Chat', headerBackTitle: 'Atrás' }}
      />
    </Stack.Navigator>
  );
}

import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootStackParamList } from './src/navigation';
import { theme } from './src/theme';
import AuthScreen from './src/screens/AuthScreen';
import MembersScreen from './src/screens/MembersScreen';
import AddMemberScreen from './src/screens/AddMemberScreen';
import MemberDetailScreen from './src/screens/MemberDetailScreen';
import AddMeasurementScreen from './src/screens/AddMeasurementScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.bg,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: theme.colors.bg },
  headerTitleStyle: { color: theme.colors.text },
  headerTintColor: theme.colors.accent,
  contentStyle: { backgroundColor: theme.colors.bg },
};

function Root() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Members" component={MembersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddMember" component={AddMemberScreen} options={{ title: 'New member' }} />
      <Stack.Screen name="MemberDetail" component={MemberDetailScreen} options={{ title: 'Member' }} />
      <Stack.Screen name="AddMeasurement" component={AddMeasurementScreen} options={{ title: 'Record reading' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <AuthProvider>
          <StatusBar style="light" />
          <Root />
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

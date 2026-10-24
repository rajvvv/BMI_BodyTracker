import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { theme } from '../theme';

// Dark navigation theme so there is no white flash behind screens during
// push/pop transitions.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.bg,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
    notification: theme.colors.accent,
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: theme.colors.bg },
  headerTitleStyle: { color: theme.colors.text },
  headerTintColor: theme.colors.accent,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: theme.colors.bg },
  animation: 'slide_from_right',
  animationDuration: 220,
} as const;

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'My profile' }} />
        <Stack.Screen name="member/new" options={{ title: 'New member' }} />
        <Stack.Screen name="member/[id]/index" options={{ title: 'Member' }} />
        <Stack.Screen name="member/[id]/edit" options={{ title: 'Edit member' }} />
        <Stack.Screen name="member/[id]/measure" options={{ title: 'Record reading' }} />
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <ToastProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

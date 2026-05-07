import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { ActivityIndicator, View, Text } from 'react-native';
import { auth } from './firebaseConfig';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import { PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';

import OnboardingScreen from './screens/OnboardingScreen';
import LoginScreen from './screens/LoginScreen';
import MainTabs from './navigation/MainTabs';
import TransactionsScreen from './screens/TransactionsScreen';
import PrivacySecurityScreen from './screens/PrivacySecurityScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import GroupDetailScreen from './screens/GroupDetailScreen';
import AddSplitExpenseScreen from './screens/AddSplitExpenseScreen';
import { ThemeProvider } from './context/ThemeContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#ffe6e6' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'red', marginBottom: 10 }}>App Crashed!</Text>
          <Text style={{ color: 'black' }}>{this.state.error && this.state.error.toString()}</Text>
          <Text style={{ color: 'gray', marginTop: 10, fontSize: 10 }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true); // Default to true for demo

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    DancingScript_700Bold,
  });

  // Listen for Firebase login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading || !fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#5d3fd3" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
            {user ? (
            <>
              <Stack.Screen name="Home" component={MainTabs} />
              <Stack.Screen name="Transactions" component={TransactionsScreen} options={{ animation: 'fade_from_bottom' }} />
              <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
              <Stack.Screen name="AddSplitExpense" component={AddSplitExpenseScreen} options={{ presentation: 'modal' }} />
            </>
          ) : (
            <>
              {isFirstLaunch && (
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              )}
              <Stack.Screen name="Login" component={LoginScreen} />
            </>
          )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </ThemeProvider>
    </SafeAreaProvider>
  );
}

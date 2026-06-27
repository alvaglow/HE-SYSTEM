// App.js — Root navigator. Session is driven by Firebase Auth (same accounts as
// the web app); role decides which tabs show. Push is registered on login.
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';

import LoginScreen      from './src/screens/LoginScreen';
import StudentDashboard from './src/screens/StudentDashboard';
import ParentDashboard  from './src/screens/ParentDashboard';
import AttendanceScreen from './src/screens/AttendanceScreen';
import PaymentScreen    from './src/screens/PaymentScreen';
import * as data        from './src/services/data';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const NAV_THEME = {
  dark: true,
  colors: { primary: '#e94560', background: '#0d1117', card: '#161b22', text: '#e2e8f0', border: '#30363d', notification: '#e94560' },
};

const StudentTabs = ({ user }) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ size }) => {
        const icons = { Home: '🏠', Attendance: '✋', Payment: '💳' };
        return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
      },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#8b949e',
      tabBarStyle: { backgroundColor: '#161b22', borderTopColor: '#30363d' },
      headerStyle: { backgroundColor: '#161b22' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: 'bold' },
    })}
  >
    <Tab.Screen name="Home"       options={{ title: 'Trang chủ' }}>
      {({ navigation }) => <StudentDashboard user={user} navigation={navigation} />}
    </Tab.Screen>
    <Tab.Screen name="Attendance" options={{ title: 'Điểm danh' }}>
      {() => <AttendanceScreen user={user} />}
    </Tab.Screen>
    <Tab.Screen name="Payment"    options={{ title: 'Học phí' }}>
      {({ route }) => <PaymentScreen user={user} route={route} />}
    </Tab.Screen>
  </Tab.Navigator>
);

const ParentTabs = ({ user }) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ size }) => {
        const icons = { Home: '👨‍👩‍👧', Payment: '💳' };
        return <Text style={{ fontSize: size - 4 }}>{icons[route.name]}</Text>;
      },
      tabBarActiveTintColor: '#e94560',
      tabBarInactiveTintColor: '#8b949e',
      tabBarStyle: { backgroundColor: '#161b22', borderTopColor: '#30363d' },
      headerStyle: { backgroundColor: '#161b22' },
      headerTintColor: '#fff',
    })}
  >
    <Tab.Screen name="Home"    options={{ title: 'Gia đình' }}>
      {({ navigation }) => <ParentDashboard user={user} navigation={navigation} />}
    </Tab.Screen>
    <Tab.Screen name="Payment" options={{ title: 'Học phí' }}>
      {({ route }) => <PaymentScreen user={user} route={route} />}
    </Tab.Screen>
  </Tab.Navigator>
);

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase persists the session; this fires on launch and on login/logout.
    const unsub = data.watchAuth(async (fbUser) => {
      if (fbUser) {
        const profile = await data.getProfile(fbUser.uid);
        setUser(profile);
        data.registerForPush(fbUser.uid).catch(() => {});
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => { try { unsub(); } catch (_) {} };
  }, []);

  if (loading) return null; // Expo splash covers this

  return (
    <NavigationContainer theme={NAV_THEME}>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'student' ? (
          <Stack.Screen name="StudentApp">
            {() => <StudentTabs user={user} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="ParentApp">
            {() => <ParentTabs user={user} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

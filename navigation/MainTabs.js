import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SplitManagerScreen from '../screens/SplitManagerScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant, 
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Add') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
            return <Ionicons name={iconName} size={28} color={color} />
          } else if (route.name === 'Split') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Reports') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={HomeScreen} />
      <Tab.Screen name="Split" component={SplitManagerScreen} />
      <Tab.Screen name="Add" component={AddExpenseScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const getStyles = (theme) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 0,
    backgroundColor: theme.glass.panelElevated.backgroundColor, 
    borderTopWidth: 1,
    borderTopColor: theme.glass.panelElevated.borderColor,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: Platform.OS === 'ios' ? 90 : 75,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    shadowColor: theme.glass.panelElevated.shadowColor || '#000',
    shadowOffset: theme.glass.panelElevated.shadowOffset || {
      width: 0,
      height: -4,
    },
    shadowOpacity: theme.glass.panelElevated.shadowOpacity || 0.05,
    shadowRadius: theme.glass.panelElevated.shadowRadius || 20,
  },
  tabBarLabel: {
    fontSize: 10,
    fontFamily: theme.fonts?.bodyBlack || 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  }
});

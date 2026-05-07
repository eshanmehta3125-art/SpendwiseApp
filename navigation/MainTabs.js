import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

import AddExpenseScreen from '../screens/AddExpenseScreen';
import HomeScreen from '../screens/HomeScreen';
import ReportsScreen from '../screens/ReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SplitManagerScreen from '../screens/SplitManagerScreen';

const Tab = createBottomTabNavigator();

const TabBarItem = ({ route, label, isFocused, onPress, onLongPress, theme }) => {
  const flexStyle = useAnimatedStyle(() => {
    return {
      flex: withTiming(isFocused ? 2 : 1, { duration: 200, easing: Easing.inOut(Easing.ease) }),
    };
  });

  const textAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isFocused ? 65 : 0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      opacity: withTiming(isFocused ? 1 : 0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
      transform: [{ translateX: withTiming(isFocused ? 0 : -10, { duration: 200 }) }]
    };
  });

  let iconName;
  if (route.name === 'Dashboard') {
    iconName = isFocused ? 'grid' : 'grid-outline';
  } else if (route.name === 'Add') {
    iconName = isFocused ? 'add-circle' : 'add-circle-outline';
  } else if (route.name === 'Split') {
    iconName = isFocused ? 'people' : 'people-outline';
  } else if (route.name === 'Reports') {
    iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
  } else if (route.name === 'Settings') {
    iconName = isFocused ? 'settings' : 'settings-outline';
  }

  const iconColor = isFocused ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;

  return (
    <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, flexStyle]}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={{ width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}
      >
        <Animated.View style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            borderRadius: 24,
            paddingHorizontal: 12,
            backgroundColor: isFocused ? theme.colors.primaryContainer : 'transparent',
          }
        ]}>
          <Ionicons name={iconName} size={24} color={iconColor} />
          <Animated.View style={[{ overflow: 'hidden' }, textAnimatedStyle]}>
            <Text style={{
              color: iconColor,
              fontSize: 11,
              fontFamily: theme.fonts?.bodyBlack || 'System',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginLeft: 6,
              width: 65,
            }}
              numberOfLines={1}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

function CustomTabBar({ state, descriptors, navigation, theme, isDarkMode, styles }) {
  return (
    <View style={styles.tabBarWrapper}>
      <BlurView intensity={40} tint={isDarkMode ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={styles.tabBar}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)' }]} />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabBarItem
              key={index}
              route={route}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              theme={theme}
            />
          );
        })}
      </BlurView>
    </View>
  );
}

export default function MainTabs() {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme);
  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} theme={theme} isDarkMode={isDarkMode} styles={styles} />}
      screenOptions={{
        headerShown: false,
      }}
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
  tabBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 10,
    right: 10,
    elevation: 0,
    shadowColor: theme.glass.panelElevated.shadowColor || '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 28,
    height: 70,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    overflow: 'hidden',
  }
});

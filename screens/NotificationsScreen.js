import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInRight } from 'react-native-reanimated';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Welcome to SpendWise!',
    body: 'Start tracking your expenses and manage your budget smarter.',
    time: '2h ago',
    type: 'welcome',
    icon: 'sparkles',
    color: '#0284c7'
  },
  {
    id: '2',
    title: 'Security Notice',
    body: 'Your account was logged in from a new device.',
    time: '5h ago',
    type: 'security',
    icon: 'shield-checkmark',
    color: '#059669'
  },
  {
    id: '3',
    title: 'Budget Alert',
    body: 'You have reached 80% of your monthly budget for "Dining".',
    time: '1d ago',
    type: 'budget',
    icon: 'warning',
    color: '#d97706'
  },
  {
    id: '4',
    title: 'Privacy Mode Enabled',
    body: 'Your balances are now hidden on the dashboard for extra privacy.',
    time: '2d ago',
    type: 'privacy',
    icon: 'eye-off',
    color: '#7c3aed'
  },
  {
    id: '5',
    title: 'Feature Update',
    body: 'New Bento-style reports are now available in the Reports tab.',
    time: '3d ago',
    type: 'update',
    icon: 'rocket',
    color: '#db2777'
  }
];

export default function NotificationsScreen({ navigation }) {
  const { theme, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const renderItem = ({ item, index }) => (
    <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
      <TouchableOpacity style={styles.notifCard}>
        <View style={[styles.iconBox, { backgroundColor: item.color + '1A' }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifTime}>{item.time}</Text>
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.colors.outline} />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? theme.colors.background : '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface },
  clearBtn: { padding: 8 },
  clearBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: 'bold' },
  listContent: { padding: 16 },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: { fontSize: 15, fontWeight: 'bold', color: theme.colors.onSurface },
  notifTime: { fontSize: 11, color: theme.colors.outline },
  notifBody: { fontSize: 13, color: theme.colors.onSurfaceVariant, lineHeight: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { color: theme.colors.outline, fontSize: 16, marginTop: 16, fontWeight: '500' }
});

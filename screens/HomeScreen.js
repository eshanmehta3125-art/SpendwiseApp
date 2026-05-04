import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, ScrollView, Dimensions, Alert, ActivityIndicator, useWindowDimensions, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, getDoc, doc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { BarChart } from 'react-native-gifted-charts';


const getCategories = (theme) => [
  { id: 'Food', icon: 'fast-food', color: theme.colors.tertiaryContainer },
  { id: 'Dining', icon: 'restaurant', color: theme.colors.tertiaryContainer },
  { id: 'Housing', icon: 'home', color: theme.colors.primaryContainer },
  { id: 'Travel', icon: 'airplane', color: theme.colors.tertiary },
  { id: 'Bills', icon: 'document-text', color: theme.colors.primary },
  { id: 'Shopping', icon: 'cart', color: theme.colors.secondaryContainer },
  { id: 'Others', icon: 'pricetag', color: theme.colors.outline },
];

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { theme, isDarkMode, currencySymbol, isPrivacyMode } = useTheme();
  const styles = getStyles(theme);
  
  const [transactions, setTransactions] = useState([]);
  const [userName, setUserName] = useState('User');
  const [profileImage, setProfileImage] = useState(null);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);
  
  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for profile changes (name, photo)
    const profileUnsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.name) setUserName(data.name);
        if (data.photoURL) setProfileImage(data.photoURL);
      }
    });

    // Listen for transactions
    const q = query(collection(db, 'users', auth.currentUser.uid, 'transactions'), orderBy('timestamp', 'desc'));
    const txnUnsub = onSnapshot(q, (snapshot) => {
      const txns = [];
      snapshot.forEach((doc) => txns.push({ id: doc.id, ...doc.data() }));
      setTransactions(txns);
    });

    return () => {
      profileUnsub();
      txnUnsub();
    };
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIncome - totalExpense;

  const barData = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    
    const dayTotal = transactions
      .filter(t => t.type === 'expense' && t.timestamp && new Date(t.timestamp.toDate ? t.timestamp.toDate() : t.timestamp).toDateString() === d.toDateString())
      .reduce((sum, t) => sum + Number(t.amount), 0);
      
    barData.push({
      value: dayTotal || 2, // minimum value so bars don't disappear completely
      label: dateStr,
      frontColor: theme.colors.primaryContainer
    });
  }

  const categoryTotals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const cat = t.category || 'Others';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(t.amount);
  });
  const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);
  const topCatName = sortedCategories.length > 0 ? sortedCategories[0] : 'None';
  
  const getCatColor = (catName) => {
    const catData = getCategories(theme).find(c => c.id === catName);
    return catData ? catData.color : theme.colors.outline;
  };

  const handleDeleteTransaction = (id) => {
    if (transactions.length === 0) {
      Alert.alert("Demo Mode", "Cannot delete sample transactions.");
      return;
    }
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
            } catch (err) {
              Alert.alert("Error", err.message);
            }
          }
        }
      ]
    );
  };

  const renderTransaction = (item, index) => {
    const isIncome = item.type === 'income';
    const catData = getCategories(theme).find(c => c.id === item.category) || getCategories(theme)[6];
    const iconColor = isIncome ? theme.colors.secondary : catData.color;
    
    let dateStr = item.date || 'Today';
    
    return (
      <View key={item.id || index} style={styles.txnItem}>
        <View style={styles.txnLeft}>
           <View style={[styles.txnIconBox, { backgroundColor: iconColor + '1A', color: iconColor }]}>
            <Ionicons name={isIncome ? 'briefcase' : catData.icon} size={24} color={iconColor} />
          </View>
          <View>
            <Text style={styles.txnTitle}>{item.desc || item.category || 'Transaction'}</Text>
            <Text style={styles.txnDate}>{dateStr}</Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={[styles.txnAmount, { color: isIncome ? theme.colors.secondary : theme.colors.onSurface }]}>
            {isIncome ? '+' : '-'}{currencySymbol}{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {item.receiptBase64 && (
              <TouchableOpacity onPress={() => setViewReceiptUrl(item.receiptBase64)} style={{marginRight: 8}}>
                <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            )}
            <View style={[styles.txnCatBadge, { backgroundColor: iconColor + '1A' }]}>
               <Text style={[styles.txnCatText, { color: iconColor }]}>{item.category || "General"}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={() => handleDeleteTransaction(item.id)}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    );
  };

  const displayTxns = transactions.slice(0, 4);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.colors.background} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.profilePic}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Ionicons name="person" size={24} color={theme.colors.onSurfaceVariant} />
            )}
          </View>
          <Text style={styles.headerTitle}>SpendWise</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
          <Ionicons name="notifications-outline" size={26} color={theme.colors.primaryContainer} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section: Total Balance */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.heroCard}>
          <View style={styles.heroBlob} />
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroLabel}>Total Balance</Text>
              <Text style={styles.heroBalance}>{currencySymbol}{isPrivacyMode ? '****.**' : balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatCard}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="arrow-down" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statLabel}>INCOME</Text>
                </View>
                <Text style={styles.statValue}>+{currencySymbol}{isPrivacyMode ? '***' : totalIncome.toLocaleString()}</Text>
              </View>
              <View style={styles.heroStatCard}>
                <View style={styles.statLabelRow}>
                  <Ionicons name="arrow-up" size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.statLabel}>SPENDING</Text>
                </View>
                <Text style={styles.statValue}>-{currencySymbol}{totalExpense.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Weekly Flow Chart */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.bentoCard}>
          <View style={styles.bentoHeaderRow}>
            <Text style={styles.bentoTitle}>Weekly Flow</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>LAST 7 DAYS</Text>
            </View>
          </View>
          <View style={styles.chartWrapper}>
            <BarChart
              data={barData}
              width={width - 100}
              height={120}
              barWidth={Math.max(12, (width - 120) / 14)}
              spacing={Math.max(8, (width - 120) / 14)}
              roundedTop
              hideRules
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelTextStyle={{ color: theme.colors.outline, fontSize: 10, fontFamily: theme.fonts.bodyBold, marginTop: 4 }}
              initialSpacing={10}
            />
          </View>
        </Animated.View>

        {/* Spending by Category Simulation */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.bentoCard}>
          <Text style={styles.bentoTitle}>Spending by Category</Text>
          <View style={styles.pieContainer}>
            <View style={styles.pieCircle}>
               <Text style={styles.pieSubtitle}>Most spent</Text>
               <Text style={styles.pieMainTitle}>{topCatName}</Text>
            </View>
          </View>
          <View style={styles.legendGrid}>
             {sortedCategories.slice(0, 3).map((cat, idx) => (
               <View key={idx} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getCatColor(cat) }]} />
                  <Text style={styles.legendText}>
                    {cat.toUpperCase()} ({Math.round((categoryTotals[cat] / totalExpense) * 100)}%)
                  </Text>
               </View>
             ))}
             {sortedCategories.length === 0 && (
               <Text style={[styles.legendText, { color: theme.colors.outline }]}>No expenses yet.</Text>
             )}
          </View>
        </Animated.View>

        {/* Recent Transactions List */}
        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.bentoCard}>
          <View style={styles.bentoHeaderRow}>
            <Text style={styles.bentoTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
               <Text style={styles.viewAllText}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.txnList}>
            {displayTxns.length > 0 ? (
              displayTxns.map((item, index) => renderTransaction(item, index))
            ) : (
              <Text style={{ textAlign: 'center', color: theme.colors.outlineVariant, marginTop: 16 }}>No transactions yet.</Text>
            )}
          </View>
        </Animated.View>

      </ScrollView>

      {/* View Receipt Full Screen Modal */}
      <Modal visible={!!viewReceiptUrl} transparent animationType="fade" onRequestClose={() => setViewReceiptUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={() => setViewReceiptUrl(null)}>
            <Ionicons name="close-circle" size={36} color="#ffffff" />
          </TouchableOpacity>
          {viewReceiptUrl && <Image source={{ uri: viewReceiptUrl }} style={{ width: '90%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120, // space for bottom tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.glass.panelElevated.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: theme.glass.panelElevated.borderColor,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  headerTitle: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontFamily: theme.fonts.headline,
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Hero Card
  heroCard: {
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: theme.colors.primaryContainer,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 10,
    minHeight: 220,
  },
  heroBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroContent: {
    padding: 32,
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  heroLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: theme.fonts.bodyMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroBalance: {
    color: theme.colors.onPrimaryContainer,
    fontSize: 48,
    fontFamily: theme.fonts.headline,
    letterSpacing: -2,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginLeft: 6,
  },
  statValue: {
    color: theme.colors.onPrimaryContainer,
    fontSize: 20,
    fontFamily: theme.fonts.headlineBold,
  },

  // Bento Box general
  bentoCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.surfaceContainerHigh,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bentoTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
  },
  badge: {
    backgroundColor: theme.colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  badgeText: {
    color: theme.colors.onSecondaryFixed,
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  viewAllText: {
    color: theme.colors.primaryContainer,
    fontSize: 10,
    fontFamily: theme.fonts.bodyBlack,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  
  chartWrapper: {
    alignItems: 'center',
    height: 140,
    justifyContent: 'flex-end',
  },

  // Pie Area
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  pieCircle: {
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 16,
    borderColor: theme.colors.primaryContainer,
    // Note: react-native doesn't support conic-gradients natively easily without SVG, so we mock the look with borders
    borderLeftColor: theme.colors.tertiaryContainer,
    borderBottomColor: theme.colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieSubtitle: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.outline,
    textTransform: 'uppercase',
  },
  pieMainTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.headline,
    color: theme.colors.onSurface,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.onSurfaceVariant,
  },

  // Transactions list
  txnList: {
    marginTop: 8,
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  txnIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txnTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  txnDate: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.outline,
  },
  txnRight: {
    alignItems: 'flex-end',
  },
  txnAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.headline,
    marginBottom: 6,
  },
  txnCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  txnCatText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
});

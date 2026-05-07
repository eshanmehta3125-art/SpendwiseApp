import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { BarChart as GiftedBarChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

const CATEGORIES = [
  { id: 'All History', icon: 'list' },
  { id: 'Food', icon: 'restaurant' },
  { id: 'Shopping', icon: 'bag-handle' },
  { id: 'Transport', icon: 'car' },
  { id: 'Travel', icon: 'airplane' },
  { id: 'Bills', icon: 'document-text' },
  { id: 'Fun', icon: 'game-controller' },
];

const getCategories = (theme) => [
  { id: 'Dining', icon: 'restaurant', color: '#D28E8E' },
  { id: 'Shopping', icon: 'bag-handle', color: '#9B8BBA' },
  { id: 'Transport', icon: 'car', color: '#7CA5B8' },
  { id: 'Housing', icon: 'home', color: '#8CAE8F' },
  { id: 'Bills', icon: 'document-text', color: '#D8A47E' },
  { id: 'Groceries', icon: 'cart', color: '#79B4A9' },
  { id: 'Health', icon: 'medkit', color: '#D67B80' },
  { id: 'Fun', icon: 'game-controller', color: '#D3B87A' },
  { id: 'Travel', icon: 'airplane', color: '#7E8DA6' },
];

export default function ReportsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { theme, currencySymbol, isPrivacyMode, isDarkMode } = useTheme();
  const styles = getStyles(theme);
  
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Yearly');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All History');

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'users', auth.currentUser.uid, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns = [];
      snapshot.forEach(doc => txns.push({ id: doc.id, ...doc.data() }));
      setTransactions(txns);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const expenses = transactions.filter(t => t.type === 'expense');
  const filteredExpenses = expenses.filter(t => {
    // 1. Search Filter
    const matchesSearch = t.desc?.toLowerCase().includes(searchQuery.toLowerCase()) || t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Category Filter
    const matchesCat = selectedCategory === 'All History' || t.category === (selectedCategory === 'Food' ? 'Dining' : selectedCategory);
    
    // 3. Time Period Filter
    let matchesPeriod = true;
    const now = new Date();
    const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || t.date);

    if (filter === 'Daily') {
      matchesPeriod = tDate.toDateString() === now.toDateString();
    } else if (filter === 'Weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      matchesPeriod = tDate >= weekAgo;
    } else if (filter === 'Monthly') {
      matchesPeriod = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    } else if (filter === 'Yearly') {
      matchesPeriod = tDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesCat && matchesPeriod;
  });

  const income = transactions.filter(t => t.type === 'income');
  const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSpent = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Budget vs Savings Calculation
  const budgetPct = totalIncome > 0 ? Math.min(100, Math.round((totalSpent / totalIncome) * 100)) : (totalSpent > 0 ? 100 : 0);
  const savingsPct = totalIncome > totalSpent ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0;

  // Insight Logic (Category comparison)
  const now = new Date();
  const lastMonth = new Date();
  lastMonth.setMonth(now.getMonth() - 1);

  const getCatSpend = (txns, date) => {
    const res = {};
    txns.filter(t => {
      const d = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || t.date);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    }).forEach(t => {
      res[t.category] = (res[t.category] || 0) + t.amount;
    });
    return res;
  };

  const currentMonthCatSpend = getCatSpend(expenses, now);
  const lastMonthCatSpend = getCatSpend(expenses, lastMonth);

  // Find top category change
  let topCat = "General";
  let catChange = 0;
  let isIncrease = true;

  Object.keys(currentMonthCatSpend).forEach(cat => {
    const current = currentMonthCatSpend[cat];
    const prev = lastMonthCatSpend[cat] || 0;
    if (prev > 0) {
      const change = ((current - prev) / prev) * 100;
      if (Math.abs(change) > Math.abs(catChange)) {
        catChange = Math.round(change);
        topCat = cat;
        isIncrease = change > 0;
      }
    } else if (current > 0 && !catChange) {
      topCat = cat;
      catChange = 100;
      isIncrease = true;
    }
  });

  const insightText = catChange !== 0 
    ? `Your expenses in ${topCat} ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(catChange)}% compared to last month.`
    : "Your spending habits are stable compared to last month.";

  // Helper to determine if transaction date is in previous period
  const getIsPreviousPeriod = (tDate, currentFilter) => {
    const now = new Date();
    if (currentFilter === 'Daily') {
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      return tDate.toDateString() === yesterday.toDateString();
    } else if (currentFilter === 'Weekly') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(now.getDate() - 14);
      return tDate >= fourteenDaysAgo && tDate < sevenDaysAgo;
    } else if (currentFilter === 'Monthly') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return tDate.getMonth() === prevMonth.getMonth() && tDate.getFullYear() === prevMonth.getFullYear();
    } else if (currentFilter === 'Yearly') {
      return tDate.getFullYear() === now.getFullYear() - 1;
    }
    return false;
  };

  // Filter previous period expenses
  const prevPeriodExpenses = expenses.filter(t => {
    const matchesSearch = t.desc?.toLowerCase().includes(searchQuery.toLowerCase()) || t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All History' || t.category === (selectedCategory === 'Food' ? 'Dining' : selectedCategory);
    const tDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp || t.date);
    return matchesSearch && matchesCat && getIsPreviousPeriod(tDate, filter);
  });

  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const prevTotalExpense = prevPeriodExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate percentage change
  let percentChange = 0;
  if (prevTotalExpense > 0) {
    percentChange = Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100);
  } else if (totalExpense > 0) {
    percentChange = 100;
  }

  const isTrendIncrease = percentChange > 0;
  const isTrendZero = percentChange === 0;

  const trendArrow = isTrendZero ? 'remove' : (isTrendIncrease ? 'arrow-up' : 'arrow-down');
  const trendColor = isTrendZero ? theme.colors.outline : (isTrendIncrease ? '#ef4444' : '#10b981'); 
  const trendBgColor = isTrendZero ? theme.colors.surfaceContainerHigh : (isTrendIncrease ? '#ef444415' : '#10b98115');

  const dailyAverage = filteredExpenses.length > 0 ? totalExpense / 30 : 0; 

  // Pie Data
  let pieData = [];
  if (filteredExpenses.length > 0) {
    const catSpend = {};
    filteredExpenses.forEach(t => {
      catSpend[t.category] = (catSpend[t.category] || 0) + t.amount;
    });
    pieData = Object.keys(catSpend).map(catName => {
      const catDef = getCategories(theme).find(c => c.id === catName) || { id: 'Others', icon: 'pricetag', color: '#95a5a6' };
      return {
        name: catName,
        population: catSpend[catName],
        color: catDef.color,
        legendFontColor: theme.colors.onSurfaceVariant,
        legendFontSize: 12
      };
    });
  }

  const renderTxnRow = (item, index, isLast) => {
    const catData = getCategories(theme).find(c => c.id === item.category) || { id: 'Others', icon: 'pricetag', color: '#95a5a6' };
    let dateStr = item.date;
    if (item.timestamp) {
      const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
      dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return (
      <View key={item.id || index} style={[styles.txnRow, isLast && { borderBottomWidth: 0, paddingBottom: 0 }]}>
        <View style={styles.txnLeft}>
          <View style={[styles.txnIconBox, { backgroundColor: catData.color + '1A' }]}>
            <Ionicons name={catData.icon} size={20} color={catData.color} />
          </View>
          <View>
            <Text style={styles.txnTitle}>{item.desc || item.category}</Text>
            <Text style={styles.txnRef}>Ref: #{item.id?.slice(0,5)}</Text>
          </View>
        </View>
        <View style={styles.txnRight}>
          <Text style={styles.txnAmount}>-{currencySymbol}{isPrivacyMode ? '***.**' : item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
          <Text style={styles.txnDate}>{dateStr}</Text>
        </View>
      </View>
    );
  };

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending Reports</Text>
        <Text style={styles.headerSub}>Detailed analysis of your financial flow.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Search & Categories Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(800).springify()} style={styles.searchCard}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={theme.colors.outline} style={{ marginRight: 10 }} />
            <TextInput 
              placeholder="Search transactions..." 
              placeholderTextColor={theme.colors.outline}
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                style={[styles.chip, selectedCategory === cat.id && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextActive]}>{cat.id}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Period Selector Card (Daily, Weekly, Monthly, Yearly) */}
        <Animated.View entering={FadeInDown.delay(200).duration(800).springify()} style={styles.periodCard}>
          <Text style={styles.periodTitle}>Spending Overview</Text>
          <View style={styles.tabContainer}>
            {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(t => (
              <TouchableOpacity 
                key={t} 
                style={[styles.tabBtn, filter === t && styles.tabBtnActive]} 
                onPress={() => setFilter(t)}
              >
                <Text style={[styles.tabText, filter === t && styles.tabTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.periodSummary}>
             <View>
                <Text style={styles.periodLabel}>TOTAL EXPENSE</Text>
                <Text style={styles.periodValue}>{currencySymbol}{isPrivacyMode ? '****.**' : totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
             </View>
             <View style={[styles.trendBadge, { backgroundColor: trendBgColor, borderColor: trendColor + '20', borderWidth: 1 }]}>
                <Ionicons name={trendArrow} size={14} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor }]}> {Math.abs(percentChange)}%</Text>
             </View>
          </View>
        </Animated.View>

        {/* Bento Grid Features */}
        <View style={styles.bentoContainer}>
          {/* Daily Average */}
          <Animated.View entering={FadeInDown.delay(300).duration(800).springify()} style={[styles.bentoCard, { backgroundColor: '#c2410c', flex: 1 }]}>
            <View style={styles.bentoIconBox}>
              <Ionicons name="stats-chart" size={24} color="#ffffff" />
            </View>
            <Text style={styles.bentoLabelCenter}>Daily Average</Text>
            <Text style={styles.bentoValueCenter}>{currencySymbol}{isPrivacyMode ? '***' : dailyAverage.toLocaleString(undefined, { maximumFractionDigits: 1 })}</Text>
          </Animated.View>
        </View>

        {/* Analytics Preview Card */}
        <Animated.View entering={FadeInDown.delay(500).duration(800).springify()} style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>Analytics Preview</Text>
          <Text style={styles.analyticsSub}>{insightText}</Text>
          
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
               <View style={[styles.circleProgress, { borderColor: '#0ea5e9' }]}>
                  <Text style={styles.progressValue}>{budgetPct}%</Text>
               </View>
               <Text style={styles.progressLabel}>BUDGET</Text>
            </View>
            <View style={styles.progressItem}>
               <View style={[styles.circleProgress, { borderColor: '#f97316' }]}>
                  <Text style={styles.progressValue}>{savingsPct}%</Text>
               </View>
               <Text style={styles.progressLabel}>SAVINGS</Text>
            </View>
          </View>
        </Animated.View>

        {/* Category Split (Pie Chart) - Kept as requested */}
        <Animated.View entering={FadeInDown.delay(600).duration(800).springify()} style={styles.pieCard}>
          <Text style={styles.pieTitle}>Category Split</Text>
          <View style={{ alignItems: 'center' }}>
            {pieData.length > 0 ? (
              <PieChart
                data={pieData}
                width={width - 80}
                height={140}
                chartConfig={{
                  backgroundColor: theme.colors.surfaceContainerLowest,
                  backgroundGradientFrom: theme.colors.surfaceContainerLowest,
                  backgroundGradientTo: theme.colors.surfaceContainerLowest,
                  color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]}
                hasLegend={true}
              />
            ) : (
              <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, padding: 20 }}>No data to display.</Text>
            )}
          </View>
        </Animated.View>

        {/* Recent Transactions list */}
        <Animated.View entering={FadeInUp.delay(700).duration(800).springify()} style={styles.listCard}>
           <Text style={styles.listTitle}>Top Transactions</Text>
           {filteredExpenses.length > 0 ? 
              filteredExpenses.sort((a,b) => b.amount - a.amount).slice(0,5).map((item, index, arr) => renderTxnRow(item, index, index === arr.length - 1))
              : 
              <Text style={styles.emptyText}>No data for this filter.</Text>
           }
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { color: theme.colors.onSurface, fontSize: 28, fontWeight: '900' },
  headerSub: { color: theme.colors.outline, fontSize: 14, marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 16,
    padding: 6,
    marginVertical: 20,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabBtnActive: { backgroundColor: theme.colors.surfaceContainerLowest, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }) },
  tabText: { color: theme.colors.outline, fontSize: 14, fontWeight: 'bold' },
  tabTextActive: { color: theme.colors.onSurface },

  mainChartCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 4 } })
  },
  chartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  chartLabelText: { fontSize: 12, fontWeight: 'bold', color: theme.colors.outline, letterSpacing: 1 },
  chartMainValue: { fontSize: 36, fontWeight: '900', color: theme.colors.onSurface, marginTop: 4 },
  trendBox: { alignItems: 'flex-end' },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendValueText: { color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' },
  trendLabel: { fontSize: 10, color: theme.colors.outlineVariant, fontWeight: 'bold', marginTop: 2 },
  barChartContainer: { marginLeft: -20 },
  yAxisText: { color: theme.colors.outlineVariant, fontSize: 11, fontWeight: 'bold' },
  xAxisText: { color: theme.colors.onSurface, fontSize: 11, fontWeight: 'bold' },

  searchCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 32,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 2 } })
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerHigh,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: { flex: 1, color: theme.colors.onSurface, fontSize: 15 },
  chipRow: { marginTop: 16 },
  chip: { backgroundColor: theme.colors.surfaceContainerHigh, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { color: theme.colors.outline, fontSize: 13, fontWeight: 'bold' },
  chipTextActive: { color: '#ffffff' },

  periodCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 }, android: { elevation: 2 } })
  },
  periodTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 16 },
  periodSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 },
  periodLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.outline, letterSpacing: 1 },
  periodValue: { fontSize: 32, fontWeight: '900', color: theme.colors.onSurface, marginTop: 4 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryContainer, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 4 },
  trendText: { color: theme.colors.onPrimaryContainer, fontSize: 13, fontWeight: 'bold' },

  bentoContainer: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  bentoCard: { borderRadius: 32, padding: 24, height: 150, justifyContent: 'center' },
  bentoIconBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bentoLabelCenter: { fontSize: 14, fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' },
  bentoValueCenter: { fontSize: 28, fontWeight: '900', color: '#ffffff', marginTop: 4 },

  analyticsCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 32, padding: 24, marginBottom: 20 },
  analyticsTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 8 },
  analyticsSub: { fontSize: 14, color: theme.colors.outline, lineHeight: 20 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 40, marginTop: 24 },
  progressItem: { alignItems: 'center' },
  circleProgress: { width: 60, height: 60, borderRadius: 30, borderWidth: 6, justifyContent: 'center', alignItems: 'center' },
  progressValue: { fontSize: 14, fontWeight: 'bold', color: theme.colors.onSurface },
  progressLabel: { fontSize: 10, fontWeight: 'bold', color: theme.colors.outline, marginTop: 8, letterSpacing: 1 },

  pieCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 32, padding: 24, marginBottom: 20 },
  pieTitle: { fontSize: 18, fontWeight: '900', color: theme.colors.onSurface, marginBottom: 16 },

  listCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 32, padding: 24, marginBottom: 40 },
  listTitle: { fontSize: 18, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 16 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceContainerHigh },
  txnLeft: { flexDirection: 'row', alignItems: 'center' },
  txnIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  txnTitle: { fontSize: 15, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 2 },
  txnRef: { fontSize: 12, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurfaceVariant },
  txnRight: { alignItems: 'flex-end', justifyContent: 'center' },
  txnAmount: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 4 },
  txnDate: { fontSize: 12, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline },
  emptyText: { textAlign: 'center', color: theme.colors.outline, padding: 20 }
});

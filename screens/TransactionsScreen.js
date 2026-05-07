import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

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

export default function TransactionsScreen({ navigation }) {
  const { theme, currencySymbol, isPrivacyMode } = useTheme();
  const styles = getStyles(theme);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);
  
  // Filter States
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState('All'); // 'All', 'income', 'expense'
  const [filterCategory, setFilterCategory] = useState('All'); // 'All' or category ID

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'transactions'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns = [];
      snapshot.forEach((doc) => {
        txns.push({ id: doc.id, ...doc.data() });
      });
      setTransactions(txns);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleDelete = (id) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Are you sure you want to delete this transaction?");
      if (confirmDelete) {
        deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id));
      }
    } else {
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteDoc(doc(db, 'users', auth.currentUser.uid, 'transactions', id)) }
        ]
      );
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (filterType !== 'All' && txn.type !== filterType) return false;
    if (filterCategory !== 'All' && txn.category !== filterCategory) return false;
    return true;
  });

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'income';
    const catData = getCategories(theme).find(c => c.id === item.category);
    const iconName = isIncome ? 'wallet' : (catData ? catData.icon : 'pricetag');
    const iconColor = isIncome ? theme.colors.primary : (catData ? catData.color : theme.colors.outline);

    let dateStr = item.date;
    if (item.timestamp) {
      const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
      dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    return (
      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
        <View style={styles.txnItem}>
          <View style={styles.txnLeft}>
            <View style={[styles.txnIconBox, { backgroundColor: iconColor + '15' }]}>
              <Ionicons name={iconName} size={24} color={iconColor} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.txnTitle} numberOfLines={1}>{item.desc || item.category}</Text>
              <Text style={styles.txnDate}>{dateStr}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.txnRight}>
              <Text style={[styles.txnAmount, { color: isIncome ? theme.colors.primary : theme.colors.onSurface }]}>
                {isIncome ? '+' : '-'}{currencySymbol}{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {item.receiptBase64 && (
                  <TouchableOpacity onPress={() => setViewReceiptUrl(item.receiptBase64)} style={styles.receiptBtn}>
                    <Ionicons name="receipt" size={12} color={theme.colors.onPrimaryContainer} />
                    <Text style={{fontSize: 10, fontFamily: theme.fonts.bodyBold, color: theme.colors.onPrimaryContainer, marginLeft: 4}}>Receipt</Text>
                  </TouchableOpacity>
                )}
                <View style={[styles.txnCatBadge, { backgroundColor: iconColor + '1A' }]}>
                   <Text style={[styles.txnCatText, { color: iconColor }]}>{item.category || "General"}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterModalVisible(true)}>
          <Ionicons name="options-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptyText}>No transactions match your current filters.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            keyExtractor={item => item.id}
            renderItem={renderTransaction}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* View Receipt Full Screen Modal */}
      <Modal visible={!!viewReceiptUrl} transparent animationType="fade" onRequestClose={() => setViewReceiptUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }} onPress={() => setViewReceiptUrl(null)}>
            <Ionicons name="close-circle" size={36} color="#ffffff" />
          </TouchableOpacity>
          {viewReceiptUrl && <Image source={{ uri: viewReceiptUrl }} style={{ width: '90%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={styles.modalTitle}>Filter Transactions</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterRow}>
              {['All', 'income', 'expense'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.filterChip, filterType === type && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                  onPress={() => setFilterType(type)}
                >
                  <Text style={[styles.filterChipText, filterType === type && { color: theme.colors.onPrimaryContainer, fontFamily: theme.fonts.bodyBold }]}>
                    {type === 'income' ? 'Income' : type === 'expense' ? 'Expense' : 'All Types'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>Category</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity 
                style={[styles.filterChip, filterCategory === 'All' && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                onPress={() => setFilterCategory('All')}
              >
                <Text style={[styles.filterChipText, filterCategory === 'All' && { color: theme.colors.onPrimaryContainer, fontFamily: theme.fonts.bodyBold }]}>All Categories</Text>
              </TouchableOpacity>
              {getCategories(theme).map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[styles.filterChip, filterCategory === cat.id && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary }]}
                  onPress={() => setFilterCategory(cat.id)}
                >
                  <Text style={[styles.filterChipText, filterCategory === cat.id && { color: theme.colors.onPrimaryContainer, fontFamily: theme.fonts.bodyBold }]}>{cat.id}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={styles.applyFilterBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.applyFilterBtnText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.background,
  },
  backBtn: { padding: 8, backgroundColor: theme.colors.surfaceContainerHighest, borderRadius: 12 },
  filterBtn: { padding: 8, backgroundColor: theme.colors.surfaceContainerHighest, borderRadius: 12 },
  headerTitle: { color: theme.colors.onSurface, fontSize: 22, fontFamily: theme.fonts.headlineBold },
  content: { flex: 1, paddingHorizontal: 20 },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    paddingRight: 12,
  },
  txnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txnTitle: {
    fontSize: 15,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
    marginBottom: 2,
  },
  txnDate: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  txnRight: {
    alignItems: 'flex-end',
    justifyContent: 'center'
  },
  txnAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.headlineBold,
    marginBottom: 6,
  },
  txnCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  txnCatText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8
  },
  deleteBtn: {
    marginLeft: 16,
    padding: 8,
    backgroundColor: theme.colors.errorContainer,
    borderRadius: 12
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primaryContainer, justifyContent: 'center', alignItems: 'center', marginBottom: 24
  },
  emptyTitle: {
    color: theme.colors.onSurface,
    fontSize: 20,
    fontFamily: theme.fonts.headlineBold,
    marginBottom: 8
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    paddingHorizontal: 40
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 22, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  filterLabel: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginTop: 16, marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.outlineVariant, marginBottom: 8 },
  filterChipText: { fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurfaceVariant },
  applyFilterBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32 },
  applyFilterBtnText: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onPrimary }
});

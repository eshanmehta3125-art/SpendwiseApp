import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const getCategories = (theme) => [
  { id: 'Food', icon: 'fast-food', color: theme.colors.error },
  { id: 'Travel', icon: 'airplane', color: theme.colors.tertiary },
  { id: 'Bills', icon: 'document-text', color: theme.colors.primary },
  { id: 'Shopping', icon: 'cart', color: theme.colors.secondary },
  { id: 'Others', icon: 'pricetag', color: theme.colors.outline },
];

export default function TransactionsScreen({ navigation }) {
  const { theme, currencySymbol, isPrivacyMode } = useTheme();
  const styles = getStyles(theme);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewReceiptUrl, setViewReceiptUrl] = useState(null);

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
      <View style={styles.txnItem}>
        <View style={styles.txnLeft}>
           <View style={[styles.txnIconBox, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <View>
            <Text style={styles.txnTitle}>{item.desc || item.category}</Text>
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
                <TouchableOpacity onPress={() => setViewReceiptUrl(item.receiptBase64)} style={{marginRight: 8}}>
                  <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              )}
              <View style={[styles.txnCatBadge, { backgroundColor: iconColor + '1A' }]}>
                 <Text style={[styles.txnCatText, { color: iconColor }]}>{item.category || "General"}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ marginLeft: 16, padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
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
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.listCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.outlineVariant} />
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={item => item.id}
              renderItem={renderTransaction}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
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
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backBtn: { padding: 4 },
  filterBtn: { padding: 4 },
  headerTitle: { color: theme.colors.onSurface, fontSize: 20, fontWeight: 'bold' },
  content: { flex: 1, padding: 24 },
  listCard: {
    flex: 1,
    ...theme.glass.panel,
    borderRadius: 20,
    overflow: 'hidden',
  },
  txnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  txnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
  },
  txnIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  txnDate: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  txnRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  txnAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  txnCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  txnCatText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.outlineVariant,
    marginHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
  }
});

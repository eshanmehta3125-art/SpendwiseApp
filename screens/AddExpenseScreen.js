import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, createElement } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';

const CATEGORIES = [
  { id: 'Dining', icon: 'restaurant' },
  { id: 'Shopping', icon: 'bag-handle' },
  { id: 'Transport', icon: 'car' },
  { id: 'Housing', icon: 'home' },
  { id: 'Bills', icon: 'document-text' },
  { id: 'Groceries', icon: 'cart' },
  { id: 'Health', icon: 'medkit' },
  { id: 'Fun', icon: 'game-controller' },
  { id: 'Travel', icon: 'airplane' },
];

export default function AddExpenseScreen({ navigation, route }) {
  const { theme, isDarkMode, currencySymbol } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Dining');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (route.params) {
      if (route.params.scannedAmount) setAmountStr(route.params.scannedAmount);
      if (route.params.scannedCategory) setCategory(route.params.scannedCategory);
      if (route.params.scannedDesc) setNote(route.params.scannedDesc);
      if (route.params.scannedDate) setDate(new Date(route.params.scannedDate));
    }
  }, [route.params]);

  const handleKeyPress = (key) => {
    if (key === 'backspace') {
      setAmountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '');
    } else if (key === '.') {
      if (!amountStr.includes('.')) setAmountStr(prev => prev + '.');
    } else {
      setAmountStr(prev => prev === '0' || prev === '' ? key : prev + key);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleAdd = async () => {
    const amt = parseFloat(amountStr);
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    setAdding(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
        desc: note || (type === 'income' ? 'Income' : category),
        amount: amt,
        type: type,
        category: type === 'income' ? 'Income' : category,
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: date
      });
      setAmountStr('');
      setNote('');
      setDate(new Date());
      Alert.alert('Success', 'Transaction added successfully!');
      navigation.navigate('Dashboard');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  };

  const formatHeaderDate = (d) => {
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return isToday ? `Today, ${datePart}` : datePart;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SpendWise</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="time-outline" size={24} color={theme.colors.onSurface} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Type Toggle */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActive]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.toggleBtnText, type === 'expense' && styles.toggleBtnTextActive]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, type === 'income' && (isDarkMode ? styles.toggleBtnActiveIncomeDark : styles.toggleBtnActiveIncome)]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.toggleBtnText, type === 'income' && styles.toggleBtnTextActive]}>Income</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Amount Spent */}
        <Animated.View entering={FadeInDown.delay(50).duration(600).springify()}>
          <LinearGradient
            colors={isDarkMode ? [theme.colors.surfaceContainerHigh, theme.colors.surfaceContainerLowest] : ['#f1f5f9', '#e2e8f0']}
            style={styles.amountCard}
          >
            <Text style={styles.amountLabel}>{type === 'expense' ? 'AMOUNT SPENT' : 'AMOUNT EARNED'}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <Text style={styles.amountValue}>{amountStr || '0'}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Category */}
        {type === 'expense' && (
          <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Category</Text>
              <Ionicons name="shapes" size={20} color="#0284c7" />
            </View>
            <View style={styles.pillRow}>
              {CATEGORIES.map(cat => {
                const isActive = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => setCategory(cat.id)}
                  >
                    <Ionicons name={cat.icon} size={16} color={isActive ? '#ffffff' : (isDarkMode ? theme.colors.onSurface : '#475569')} style={{ marginRight: 6 }} />
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat.id}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.pill}>
                <Text style={styles.pillText}>...</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Date */}
        <Animated.View entering={FadeInDown.delay(150).duration(600).springify()}>
          <View style={styles.rowCard}>
            <Ionicons name="calendar-outline" size={24} color="#d97706" style={{ marginRight: 16 }} />
            <View style={styles.rowCardTextCol}>
              <Text style={styles.rowCardLabel}>DATE</Text>
              <Text style={styles.rowCardValue}>{formatHeaderDate(date)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />

            <TouchableOpacity
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
              onPress={() => {
                if (Platform.OS === 'web') {
                  const input = document.getElementById('web-date-input');
                  if (input && input.showPicker) {
                    input.showPicker();
                  }
                } else {
                  setShowDatePicker(true);
                }
              }}
            />

            {Platform.OS === 'web' && createElement('input', {
              id: 'web-date-input',
              type: 'date',
              value: date.toISOString().split('T')[0],
              max: new Date().toISOString().split('T')[0],
              onChange: (e) => {
                if (e.target.value) {
                  const [y, m, d] = e.target.value.split('-');
                  setDate(new Date(y, m - 1, d));
                }
              },
              style: { position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }
            })}
          </View>
        </Animated.View>

        {/* Add Note */}
        <Animated.View entering={FadeInDown.delay(200).duration(600).springify()} style={styles.card}>
          <Text style={styles.rowCardLabel}>ADD NOTE</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What was this for?"
            placeholderTextColor={isDarkMode ? theme.colors.outline : '#94a3b8'}
            value={note}
            onChangeText={setNote}
          />
        </Animated.View>

        {/* Capture Receipt */}
        <Animated.View entering={FadeInDown.delay(250).duration(600).springify()}>
          <TouchableOpacity style={styles.receiptCard} onPress={() => navigation.navigate('Camera')}>
            <View style={styles.receiptIconCircle}>
              <Ionicons name="receipt" size={24} color="#c2410c" />
            </View>
            <Text style={styles.receiptText}>CAPTURE RECEIPT</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Keypad */}
        <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.keypadCard}>
          <View style={styles.keypadRow}>
            {['1', '2', '3'].map(k => (
              <TouchableOpacity key={k} style={styles.keyBtn} onPress={() => handleKeyPress(k)}>
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['4', '5', '6'].map(k => (
              <TouchableOpacity key={k} style={styles.keyBtn} onPress={() => handleKeyPress(k)}>
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            {['7', '8', '9'].map(k => (
              <TouchableOpacity key={k} style={styles.keyBtn} onPress={() => handleKeyPress(k)}>
                <Text style={styles.keyText}>{k}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.keypadRow}>
            <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('.')}>
              <Text style={styles.keyText}>.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('0')}>
              <Text style={styles.keyText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keyBtn} onPress={() => handleKeyPress('backspace')}>
              <Ionicons name="backspace" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE EXPENSE</Text>}
          </TouchableOpacity>
        </Animated.View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
        {Platform.OS === 'ios' && showDatePicker && (
          <TouchableOpacity style={{ padding: 16, alignItems: 'flex-end' }} onPress={() => setShowDatePicker(false)}>
            <Text style={{ color: '#0284c7', fontSize: 16, fontFamily: theme.fonts.headlineBold }}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: theme.colors.onSurface, fontSize: 22, fontFamily: theme.fonts.headline, marginLeft: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  profilePic: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },

  content: { padding: 20, paddingBottom: 100 },

  toggleContainer: { flexDirection: 'row', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0', borderRadius: 24, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  toggleBtnActive: { backgroundColor: '#0284c7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleBtnActiveIncome: { backgroundColor: '#10b981', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleBtnActiveIncomeDark: { backgroundColor: '#059669', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleBtnText: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 14, fontFamily: theme.fonts.headlineBold },
  toggleBtnTextActive: { color: '#ffffff' },

  amountCard: {
    padding: 32,
    borderRadius: 40,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 12, fontFamily: theme.fonts.bodyBold, letterSpacing: 1.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center' },
  currencySymbol: { color: '#0284c7', fontSize: 24, fontFamily: theme.fonts.headlineBold, marginRight: 6, marginTop: -12 },
  amountValue: { color: theme.colors.onSurface, fontSize: 64, fontFamily: theme.fonts.headline, letterSpacing: -2 },

  card: {
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0',
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  cardTitle: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#ffffff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  pillActive: { backgroundColor: '#0284c7' },
  pillText: { color: isDarkMode ? theme.colors.onSurface : '#475569', fontSize: 13, fontFamily: theme.fonts.bodyBold },
  pillTextActive: { color: '#ffffff' },

  rowCard: {
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  rowCardTextCol: { flex: 1 },
  rowCardLabel: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 10, fontFamily: theme.fonts.bodyBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  rowCardValue: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },

  noteInput: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.bodyMedium, marginTop: 4, padding: 0 },

  receiptCard: {
    backgroundColor: isDarkMode ? theme.colors.tertiaryContainer : '#ffedd5',
    borderWidth: 1.5,
    borderColor: isDarkMode ? theme.colors.tertiary : '#fdba74',
    borderStyle: 'dashed',
    borderRadius: 36,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  receiptIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDarkMode ? theme.colors.surfaceContainer : '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  receiptText: { color: isDarkMode ? theme.colors.onTertiaryContainer : '#c2410c', fontSize: 12, fontFamily: theme.fonts.headlineBold, letterSpacing: 1 },

  keypadCard: {
    backgroundColor: isDarkMode ? theme.colors.surfaceContainer : '#e2e8f0',
    borderRadius: 36,
    padding: 20,
    marginBottom: 24,
  },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  keyBtn: { flex: 1, backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#ffffff', height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 30, marginHorizontal: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  keyText: { color: theme.colors.onSurface, fontSize: 24, fontFamily: theme.fonts.headlineBold },

  saveBtn: { backgroundColor: '#0284c7', borderRadius: 32, paddingVertical: 20, alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginBottom: 40 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontFamily: theme.fonts.headlineBold, letterSpacing: 1 }
});

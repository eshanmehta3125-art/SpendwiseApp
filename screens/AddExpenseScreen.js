import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Platform, ScrollView, Modal, Image,
  Animated, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, query, onSnapshot } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useTheme } from '../context/ThemeContext';
import AnimatedRN, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

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
  const amountInputRef = useRef(null);

  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Dining');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptBase64, setReceiptBase64] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [viewReceiptVisible, setViewReceiptVisible] = useState(false);

  const [friends, setFriends] = useState([]);
  const [isFriendSelectorVisible, setFriendSelectorVisible] = useState(false);
  const [selectedSplitFriends, setSelectedSplitFriends] = useState([]);
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isAiResultModalVisible, setAiResultModalVisible] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (auth.currentUser) {
      const friendsRef = collection(db, 'users', auth.currentUser.uid, 'friends');
      const unsub = onSnapshot(query(friendsRef), (snap) => {
        setFriends(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => unsub();
    }
  }, []);

  useEffect(() => {
    if (route.params) {
      if (route.params.scannedAmount) setAmountStr(route.params.scannedAmount);
      if (route.params.scannedCategory) setCategory(route.params.scannedCategory);
      if (route.params.scannedDesc) setNote(route.params.scannedDesc);
      if (route.params.scannedDate) setDate(new Date(route.params.scannedDate));
    }
  }, [route.params]);

  const openReceiptModal = () => {
    setReceiptModalVisible(true);
  };

  const closeReceiptModal = () => {
    setReceiptModalVisible(false);
  };

  const analyzeReceiptWithGemini = async (base64Img) => {
    try {
      setAiLoading(true);
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        Alert.alert('Error', 'Gemini API key is missing. Add EXPO_PUBLIC_GEMINI_API_KEY in .env');
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `Analyze this receipt. Extract the total amount and a single overall category (Dining, Shopping, Transport, Housing, Bills, Groceries, Health, Fun, Travel). Return ONLY a valid JSON object without any markdown wrapping.
Example:
{
  "totalAmount": 45.90,
  "category": "Groceries",
  "products": [ { "name": "Milk", "amount": 3.40, "category": "Groceries" } ]
}`;

      const imageParts = [{ inlineData: { data: base64Img, mimeType: "image/jpeg" } }];
      const result = await model.generateContent([prompt, ...imageParts]);
      const responseText = result.response.text();
      const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanedText);

      setAiData(parsedData);
      setAiResultModalVisible(true);
      
    } catch (error) {
      console.error(error);
      Alert.alert('AI Error', error.message || 'Failed to analyze receipt.');
    } finally {
      setAiLoading(false);
    }
  };

  const captureFromCamera = async () => {
    setReceiptModalVisible(false); // Close immediately to avoid animation conflicts with native camera
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access needed.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!result.canceled && result.assets[0].base64) {
          const fullBase64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
          setReceiptBase64(fullBase64);
          analyzeReceiptWithGemini(result.assets[0].base64);
        }
      } catch (err) { Alert.alert('Error', err.message || 'Could not open camera.'); }
    }, 100);
  };

  const pickFromGallery = async () => {
    setReceiptModalVisible(false);
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Required', 'Gallery access needed.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, base64: true });
        if (!result.canceled && result.assets[0].base64) {
          setReceiptBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
          analyzeReceiptWithGemini(result.assets[0].base64);
        }
      } catch (err) { Alert.alert('Error', err.message || 'Could not open gallery.'); }
    }, 100);
  };

  const handleSplitSubmit = async () => {
    if (selectedSplitFriends.length === 0) {
      Alert.alert("Select Friends", "Please select at least one friend to split with.");
      return;
    }
    setFriendSelectorVisible(false);
    try {
      setAdding(true);
      const selectedMembers = friends.filter(f => selectedSplitFriends.includes(f.id));
      const groupName = "Receipt Split";
      const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'groups'), {
        name: groupName, type: 'Active', members: 1 + selectedMembers.length, memberIds: selectedMembers.map(m => m.id), icon: 'receipt', color: 'primary', balance: 0
      });
      navigation.navigate('AddSplitExpense', {
        groupId: docRef.id, groupName: groupName, groupMembers: selectedMembers, initialAmount: aiData.totalAmount, initialTitle: 'Receipt ' + (aiData.category || 'Expense')
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleAdd = async () => {
    const amt = parseFloat(amountStr);
    if (!amt || isNaN(amt) || amt <= 0) { Alert.alert('Invalid Amount', 'Please enter a valid amount.'); return; }
    setAdding(true);
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
        desc: note || (type === 'income' ? 'Income' : category),
        amount: amt,
        type,
        category: type === 'income' ? 'Income' : category,
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: date,
        receiptBase64: receiptBase64 || null,
      });
      setAmountStr(''); setNote(''); setDate(new Date()); setReceiptBase64(null);
      setSuccessModalVisible(true);
      setTimeout(() => {
        setSuccessModalVisible(false);
        navigation.navigate('Dashboard');
      }, 2500);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setAdding(false); }
  };

  const formatHeaderDate = (d) => {
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const datePart = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return isToday ? `Today, ${datePart}` : datePart;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Transaction</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Type Toggle */}
          <AnimatedRN.View entering={FadeInDown.duration(500).springify()} style={styles.toggleContainer}>
            <TouchableOpacity style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActive]} onPress={() => setType('expense')}>
              <Text style={[styles.toggleBtnText, type === 'expense' && styles.toggleBtnTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, type === 'income' && (isDarkMode ? styles.toggleBtnActiveIncomeDark : styles.toggleBtnActiveIncome)]} onPress={() => setType('income')}>
              <Text style={[styles.toggleBtnText, type === 'income' && styles.toggleBtnTextActive]}>Income</Text>
            </TouchableOpacity>
          </AnimatedRN.View>

          {/* Amount Card - tap to focus keyboard */}
          <AnimatedRN.View entering={FadeInDown.delay(50).duration(500).springify()}>
            <TouchableOpacity activeOpacity={0.9} onPress={() => amountInputRef.current?.focus()}>
              <LinearGradient colors={isDarkMode ? [theme.colors.surfaceContainerHigh, theme.colors.surfaceContainerLowest] : ['#f1f5f9', '#e2e8f0']} style={styles.amountCard}>
                <Text style={styles.amountLabel}>{type === 'expense' ? 'AMOUNT SPENT' : 'AMOUNT EARNED'}</Text>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  <TextInput
                    ref={amountInputRef}
                    style={styles.amountValue}
                    value={amountStr}
                    onChangeText={(t) => { if (/^\d*\.?\d*$/.test(t)) setAmountStr(t); }}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? theme.colors.outline : '#94a3b8'}
                    returnKeyType="done"
                  />
                </View>
                <Text style={styles.tapHint}>Tap to enter amount</Text>
              </LinearGradient>
            </TouchableOpacity>
          </AnimatedRN.View>

          {/* Category */}
          {type === 'expense' && (
            <AnimatedRN.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Category</Text>
                <Ionicons name="shapes" size={20} color="#0284c7" />
              </View>
              <View style={styles.pillRow}>
                {CATEGORIES.map(cat => {
                  const isActive = category === cat.id;
                  return (
                    <TouchableOpacity key={cat.id} style={[styles.pill, isActive && styles.pillActive]} onPress={() => setCategory(cat.id)}>
                      <Ionicons name={cat.icon} size={16} color={isActive ? '#fff' : (isDarkMode ? theme.colors.onSurface : '#475569')} style={{ marginRight: 6 }} />
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat.id}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AnimatedRN.View>
          )}

          {/* Date */}
          <AnimatedRN.View entering={FadeInDown.delay(150).duration(500).springify()}>
            <TouchableOpacity style={styles.rowCard} onPress={() => Platform.OS === 'web' ? null : setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={24} color="#d97706" style={{ marginRight: 16 }} />
              <View style={styles.rowCardTextCol}>
                <Text style={styles.rowCardLabel}>DATE</Text>
                <Text style={styles.rowCardValue}>{formatHeaderDate(date)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </AnimatedRN.View>

          {/* Note */}
          <AnimatedRN.View entering={FadeInDown.delay(200).duration(500).springify()} style={styles.card}>
            <Text style={styles.rowCardLabel}>ADD NOTE</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What was this for?"
              placeholderTextColor={isDarkMode ? theme.colors.outline : '#94a3b8'}
              value={note}
              onChangeText={setNote}
            />
          </AnimatedRN.View>

          {/* Receipt */}
          <AnimatedRN.View entering={FadeInDown.delay(250).duration(500).springify()}>
            <TouchableOpacity style={styles.receiptCard} onPress={openReceiptModal}>
              {receiptBase64 ? (
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.receiptPreviewWrap}>
                    <Image source={{ uri: receiptBase64 }} style={styles.receiptThumb} />
                    <View style={styles.receiptCheck}>
                      <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                    </View>
                  </View>
                  <Text style={[styles.receiptText, { color: '#10b981', marginTop: 8 }]}>RECEIPT ATTACHED — TAP TO CHANGE</Text>
                  <TouchableOpacity style={styles.viewReceiptBtn} onPress={() => setViewReceiptVisible(true)}>
                    <Ionicons name="eye-outline" size={16} color="#0284c7" style={{ marginRight: 6 }} />
                    <Text style={styles.viewReceiptBtnText}>VIEW RECEIPT</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.receiptIconCircle}>
                    <Ionicons name="receipt" size={24} color="#c2410c" />
                  </View>
                  <Text style={styles.receiptText}>CAPTURE RECEIPT</Text>
                  <Text style={styles.receiptSub}>Take a photo or choose from gallery</Text>
                </>
              )}
            </TouchableOpacity>
          </AnimatedRN.View>

          {/* Save */}
          <AnimatedRN.View entering={FadeInUp.delay(300).duration(500).springify()}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={adding}>
              {adding ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>SAVE {type === 'income' ? 'INCOME' : 'EXPENSE'}</Text>}
            </TouchableOpacity>
          </AnimatedRN.View>

          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} maximumDate={new Date()} />
          )}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity style={{ padding: 16, alignItems: 'flex-end' }} onPress={() => setShowDatePicker(false)}>
              <Text style={{ color: '#0284c7', fontSize: 16, fontFamily: theme.fonts.headlineBold }}>Done</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Native Receipt Capture Modal */}
      <Modal visible={receiptModalVisible} transparent animationType="slide" onRequestClose={closeReceiptModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModal, { paddingBottom: 48 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.receiptModalTitle}>Add Receipt</Text>
            <Text style={styles.receiptModalSub}>Attach a receipt to this transaction</Text>

            <TouchableOpacity style={styles.receiptOption} onPress={captureFromCamera}>
              <View style={[styles.receiptOptionIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="camera" size={28} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.receiptOptionTitle}>Take a Photo</Text>
                <Text style={styles.receiptOptionSub}>Use camera to capture receipt</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.receiptOption} onPress={pickFromGallery}>
              <View style={[styles.receiptOptionIcon, { backgroundColor: '#fdf4ff' }]}>
                <Ionicons name="images" size={28} color="#9333ea" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.receiptOptionTitle}>Upload from Gallery</Text>
                <Text style={styles.receiptOptionSub}>Choose an existing photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.outline} />
            </TouchableOpacity>

            {receiptBase64 && (
              <TouchableOpacity style={[styles.receiptOption, { borderColor: '#fecaca' }]} onPress={() => { setReceiptBase64(null); closeReceiptModal(); }}>
                <View style={[styles.receiptOptionIcon, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="trash" size={28} color="#dc2626" />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.receiptOptionTitle, { color: '#dc2626' }]}>Remove Receipt</Text>
                  <Text style={styles.receiptOptionSub}>Delete the attached receipt</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.receiptCancelBtn} onPress={closeReceiptModal}>
              <Text style={styles.receiptCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={isSuccessModalVisible} transparent animationType="fade">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff', padding: 40, borderRadius: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.1, shadowRadius: 30, elevation: 10}}>
             <View style={{width: 80, height: 80, borderRadius: 40, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginBottom: 20}}>
               <Ionicons name="checkmark-sharp" size={48} color="#ffffff" />
             </View>
             <Text style={{fontSize: 26, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface}}>Success!</Text>
             <Text style={{fontSize: 15, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline, marginTop: 8}}>Transaction has been added</Text>
          </View>
        </View>
      </Modal>

      {/* View Receipt Full Screen Modal */}
      <Modal visible={viewReceiptVisible} transparent animationType="fade" onRequestClose={() => setViewReceiptVisible(false)}>
        <View style={styles.viewReceiptOverlay}>
          <TouchableOpacity style={styles.viewReceiptClose} onPress={() => setViewReceiptVisible(false)}>
            <Ionicons name="close-circle" size={36} color="#ffffff" />
          </TouchableOpacity>
          {receiptBase64 && <Image source={{ uri: receiptBase64 }} style={styles.viewReceiptImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* AI Result Modal */}
      <Modal visible={isAiResultModalVisible} transparent animationType="fade">
        <BlurView intensity={50} tint={isDarkMode ? "dark" : "dark"} experimentalBlurMethod="dimezisBlurView" style={styles.blurOverlay}>
          <View style={[styles.aiResultCard, { backgroundColor: isDarkMode ? theme.colors.surface : '#ffffff' }]}>
            
            <TouchableOpacity style={styles.aiCloseIcon} onPress={() => setAiResultModalVisible(false)}>
              <Ionicons name="close-circle" size={32} color={isDarkMode ? theme.colors.outlineVariant : '#cbd5e1'} />
            </TouchableOpacity>

            <View style={styles.aiResultHeader}>
              <View style={[styles.aiIconWrapper, { backgroundColor: theme.colors.primaryContainer }]}>
                <Ionicons name="sparkles" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.aiResultTitle, { color: theme.colors.onSurface }]}>Receipt Scanned</Text>
              <Text style={styles.aiResultSub}>Data extracted successfully</Text>
            </View>

            <View style={styles.aiResultBody}>
              <Text style={styles.aiResultLabel}>TOTAL AMOUNT</Text>
              <Text style={[styles.aiResultAmount, { color: theme.colors.onSurface }]}>{currencySymbol}{aiData?.totalAmount ? parseFloat(aiData.totalAmount).toFixed(2) : '0.00'}</Text>
              
              <View style={[styles.aiResultCategoryRow, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#f1f5f9' }]}>
                <Ionicons name="pricetag" size={16} color={theme.colors.primary} style={{marginRight: 8}} />
                <Text style={[styles.aiResultCategory, { color: theme.colors.onSurfaceVariant }]}>{aiData?.category || 'Unknown'}</Text>
              </View>
            </View>

            <View style={styles.aiResultActions}>
              <TouchableOpacity onPress={() => {
                 setAiResultModalVisible(false);
                 setAmountStr(String(aiData?.totalAmount || ''));
                 setCategory(aiData?.category || 'Dining');
              }}>
                <LinearGradient colors={[theme.colors.primary, theme.colors.primary]} style={styles.aiPrimaryBtn}>
                  <Ionicons name="wallet" size={22} color="#fff" />
                  <Text style={styles.aiPrimaryBtnText}>Add to Budget</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.aiSecondaryBtn, { borderColor: isDarkMode ? theme.colors.outlineVariant : '#e2e8f0', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f8fafc' }]} onPress={() => {
                 setAiResultModalVisible(false);
                 setTimeout(() => setFriendSelectorVisible(true), 300);
              }}>
                <Ionicons name="people" size={22} color={theme.colors.primary} />
                <Text style={[styles.aiSecondaryBtnText, { color: theme.colors.primary }]}>Split with Friends</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Friend Selector Modal */}
      <Modal visible={isFriendSelectorVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptModal, { maxHeight: '80%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={styles.receiptModalTitle}>Split with Friends</Text>
              <TouchableOpacity onPress={() => setFriendSelectorVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{maxHeight: 300, marginBottom: 16}}>
              {friends.length === 0 ? (
                <Text style={{color: theme.colors.outline}}>No friends found. Please add friends first.</Text>
              ) : (
                friends.map(friend => {
                  const isSelected = selectedSplitFriends.includes(friend.id);
                  return (
                    <TouchableOpacity 
                      key={friend.id} 
                      style={[styles.memberSelectRow, isSelected && { backgroundColor: theme.colors.surfaceContainerHighest }]}
                      onPress={() => {
                        if (isSelected) setSelectedSplitFriends(selectedSplitFriends.filter(id => id !== friend.id));
                        else setSelectedSplitFriends([...selectedSplitFriends, friend.id]);
                      }}
                    >
                      <Image source={{ uri: friend.img }} style={styles.memberSelectImg} />
                      <Text style={styles.memberSelectName}>{friend.name}</Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10b981" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSplitSubmit} disabled={selectedSplitFriends.length === 0}>
              <Text style={styles.saveBtnText}>Continue to Split</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {aiLoading && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={{color: '#fff', marginTop: 16, fontSize: 16, fontFamily: theme.fonts.headlineBold}}>Analyzing Receipt...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: theme.colors.onSurface, fontSize: 20, fontFamily: theme.fonts.headline, marginLeft: 16 },
  content: { padding: 20, paddingBottom: 100 },

  toggleContainer: { flexDirection: 'row', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0', borderRadius: 24, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 20 },
  toggleBtnActive: { backgroundColor: '#0284c7', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleBtnActiveIncome: { backgroundColor: '#10b981', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleBtnActiveIncomeDark: { backgroundColor: '#059669' },
  toggleBtnText: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 14, fontFamily: theme.fonts.headlineBold },
  toggleBtnTextActive: { color: '#ffffff' },

  amountCard: { padding: 32, borderRadius: 40, alignItems: 'center', marginBottom: 24 },
  amountLabel: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 12, fontFamily: theme.fonts.bodyBold, letterSpacing: 1.5, marginBottom: 8 },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { color: '#0284c7', fontSize: 28, fontFamily: theme.fonts.headlineBold, marginRight: 4, marginBottom: -8 },
  amountValue: { color: theme.colors.onSurface, fontSize: 64, fontFamily: theme.fonts.headline, letterSpacing: -2, minWidth: 80, textAlign: 'center' },
  tapHint: { color: isDarkMode ? theme.colors.outline : '#94a3b8', fontSize: 11, fontFamily: theme.fonts.bodyMedium, marginTop: 8, letterSpacing: 0.5 },

  card: { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0', borderRadius: 28, padding: 24, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  cardTitle: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#ffffff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24 },
  pillActive: { backgroundColor: '#0284c7' },
  pillText: { color: isDarkMode ? theme.colors.onSurface : '#475569', fontSize: 13, fontFamily: theme.fonts.bodyBold },
  pillTextActive: { color: '#ffffff' },

  rowCard: { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#e2e8f0', borderRadius: 28, padding: 20, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  rowCardTextCol: { flex: 1 },
  rowCardLabel: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 10, fontFamily: theme.fonts.bodyBold, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  rowCardValue: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },
  noteInput: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.bodyMedium, marginTop: 4 },

  receiptCard: { backgroundColor: isDarkMode ? theme.colors.tertiaryContainer : '#ffedd5', borderWidth: 1.5, borderColor: isDarkMode ? theme.colors.tertiary : '#fdba74', borderStyle: 'dashed', borderRadius: 36, padding: 28, alignItems: 'center', marginBottom: 20 },
  receiptIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDarkMode ? theme.colors.surfaceContainer : '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  receiptText: { color: isDarkMode ? theme.colors.onTertiaryContainer : '#c2410c', fontSize: 12, fontFamily: theme.fonts.headlineBold, letterSpacing: 1 },
  receiptSub: { color: isDarkMode ? theme.colors.outline : '#a16207', fontSize: 11, fontFamily: theme.fonts.bodyMedium, marginTop: 4 },
  receiptPreviewWrap: { position: 'relative', marginBottom: 4 },
  receiptThumb: { width: 80, height: 80, borderRadius: 16 },
  receiptCheck: { position: 'absolute', bottom: -8, right: -8, backgroundColor: '#fff', borderRadius: 16 },
  viewReceiptBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  viewReceiptBtnText: { color: '#0284c7', fontSize: 11, fontFamily: theme.fonts.bodyBold, letterSpacing: 0.5 },

  saveBtn: { backgroundColor: '#0284c7', borderRadius: 32, paddingVertical: 20, alignItems: 'center', shadowColor: '#0284c7', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginBottom: 40 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontFamily: theme.fonts.headlineBold, letterSpacing: 1 },

  // Receipt Modal
  receiptModal: { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: 48 },
  modalHandle: { width: 40, height: 4, backgroundColor: theme.colors.outlineVariant, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  receiptModalTitle: { fontSize: 24, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 4 },
  receiptModalSub: { fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline, marginBottom: 28 },
  receiptOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f8fafc', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: isDarkMode ? theme.colors.outlineVariant : '#f1f5f9' },
  receiptOptionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  receiptOptionTitle: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  receiptOptionSub: { fontSize: 12, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline, marginTop: 2 },
  receiptCancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 4 },
  receiptCancelText: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.outline },

  // View Receipt Full
  viewReceiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewReceiptClose: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  viewReceiptImage: { width: '90%', height: '80%' },
  
  // Custom Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  memberSelectRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#f8fafc' },
  memberSelectImg: { width: 40, height: 40, borderRadius: 20, marginRight: 16 },
  memberSelectName: { flex: 1, fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onSurface },
  
  // AI Result Modal Styles
  blurOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  aiResultCard: { width: '100%', maxWidth: 400, borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: {width: 0, height: 24}, shadowOpacity: 0.15, shadowRadius: 36, elevation: 12 },
  aiCloseIcon: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  aiResultHeader: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  aiIconWrapper: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  aiResultTitle: { fontSize: 24, fontFamily: theme.fonts.headlineBold, marginBottom: 4 },
  aiResultSub: { fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline },
  aiResultBody: { alignItems: 'center', marginBottom: 36 },
  aiResultLabel: { fontSize: 12, fontFamily: theme.fonts.bodyBold, color: theme.colors.outline, letterSpacing: 1.5, marginBottom: 6 },
  aiResultAmount: { fontSize: 56, fontFamily: theme.fonts.headlineBold, letterSpacing: -1 },
  aiResultCategoryRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 16 },
  aiResultCategory: { fontSize: 14, fontFamily: theme.fonts.bodyBold },
  aiResultActions: { gap: 12 },
  aiPrimaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 20 },
  aiPrimaryBtnText: { color: '#ffffff', fontSize: 16, fontFamily: theme.fonts.headlineBold, marginLeft: 8 },
  aiSecondaryBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 20, borderWidth: 1 },
  aiSecondaryBtnText: { fontSize: 16, fontFamily: theme.fonts.headlineBold, marginLeft: 8 },
});

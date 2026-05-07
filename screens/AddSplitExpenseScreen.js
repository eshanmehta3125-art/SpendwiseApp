import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import { addDoc, collection, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export default function AddSplitExpenseScreen({ route, navigation }) {
  const { groupId, groupName, groupMembers = [], initialAmount = '', initialTitle = '' } = route.params;
  const { theme, currencySymbol } = useTheme();
  const styles = getStyles(theme);

  const [title, setTitle] = useState(initialTitle);
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [splitType, setSplitType] = useState('Equal'); // Equal, Exact, Percentage
  const [percentageValue, setPercentageValue] = useState('');
  const [exactValue, setExactValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [paidBy, setPaidBy] = useState(auth.currentUser.uid);
  const [isPaidByModalVisible, setPaidByModalVisible] = useState(false);
  
  const allMembers = [
    { id: auth.currentUser.uid, name: 'You', img: `https://i.pravatar.cc/150?u=${auth.currentUser.uid}` },
    ...groupMembers
  ];
  
  const getPaidByName = () => {
    return allMembers.find(m => m.id === paidBy)?.name || 'You';
  };

  const handleSave = async () => {
    if (!title || !amount || isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid title and amount.');
      return;
    }
    
    setLoading(true);
    try {
      const expenseAmount = parseFloat(amount);
      
      // Add expense to group
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'groups', groupId, 'expenses'), {
        title,
        amount: expenseAmount,
        splitType,
        paidBy: paidBy,
        createdAt: serverTimestamp()
      });

      // Simple Debt Logic for Demo:
      let userShare = 0;
      if (splitType === 'Equal') {
        userShare = expenseAmount / Math.max(1, allMembers.length); // If 3 people, you owe 1/3
      } else if (splitType === 'Percentage') {
        const myPercent = parseFloat(percentageValue) || (100 / Math.max(1, allMembers.length));
        userShare = expenseAmount * (myPercent / 100);
      } else if (splitType === 'Exact') {
        const myExact = parseFloat(exactValue) || (expenseAmount / Math.max(1, allMembers.length));
        userShare = myExact;
      }
      
      // If you paid, they owe you the remaining amount.
      // If someone else paid, you owe them your share.
      let balanceChange = 0;
      if (paidBy === auth.currentUser.uid) {
        balanceChange = expenseAmount - userShare; // You paid 100, your share 50, balance +50
      } else {
        balanceChange = -userShare; // They paid 100, your share 50, balance -50
      }
      
      const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
      await updateDoc(groupRef, {
        balance: increment(balanceChange)
      });

      Alert.alert('Success', 'Expense added and split calculated!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <Text style={styles.groupContext}>With <Text style={{fontWeight: 'bold'}}>{groupName}</Text></Text>

          <View style={styles.inputCard}>
            <View style={styles.amountWrapper}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor={theme.colors.outlineVariant}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>
            <TextInput
              style={styles.titleInput}
              placeholder="What was this for?"
              placeholderTextColor={theme.colors.outline}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paid By</Text>
            <TouchableOpacity style={styles.selectorBtn} onPress={() => setPaidByModalVisible(true)}>
              <Text style={styles.selectorText}>{getPaidByName()}</Text>
              <Ionicons name="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Method</Text>
            <View style={styles.splitRow}>
              {['Equal', 'Exact', 'Percentage'].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.splitBtn, splitType === type && { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primaryContainer }]}
                  onPress={() => setSplitType(type)}
                >
                  <Text style={[styles.splitBtnText, splitType === type && { color: theme.colors.onPrimaryContainer }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {splitType === 'Percentage' && (
              <View style={styles.dynamicInputRow}>
                <Text style={styles.dynamicLabel}>Your Share (%)</Text>
                <TextInput
                  style={styles.dynamicInput}
                  placeholder="e.g. 40"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="number-pad"
                  value={percentageValue}
                  onChangeText={setPercentageValue}
                />
              </View>
            )}

            {splitType === 'Exact' && (
              <View style={styles.dynamicInputRow}>
                <Text style={styles.dynamicLabel}>Your Share ({currencySymbol})</Text>
                <TextInput
                  style={styles.dynamicInput}
                  placeholder="e.g. 50"
                  placeholderTextColor={theme.colors.outline}
                  keyboardType="decimal-pad"
                  value={exactValue}
                  onChangeText={setExactValue}
                />
              </View>
            )}
          </View>
          
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
            <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save & Split'}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paid By Modal */}
      <Modal visible={isPaidByModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={{fontSize: 20, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface}}>Who paid?</Text>
              <TouchableOpacity onPress={() => setPaidByModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: 300}}>
              {allMembers.map(member => {
                const isSelected = paidBy === member.id;
                return (
                  <TouchableOpacity 
                    key={member.id} 
                    style={[styles.memberRow, isSelected && { backgroundColor: theme.colors.surfaceContainerHigh }]}
                    onPress={() => {
                      setPaidBy(member.id);
                      setPaidByModalVisible(false);
                    }}
                  >
                    <Image source={{ uri: member.img }} style={styles.memberImg} />
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Ionicons 
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                      size={24} 
                      color={isSelected ? theme.colors.primary : theme.colors.outlineVariant} 
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 20, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  scrollContent: { padding: 20 },
  groupContext: { textAlign: 'center', fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurfaceVariant, marginBottom: 20 },
  inputCard: { backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 24, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  amountWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceContainerHigh, paddingBottom: 20 },
  currencySymbol: { fontSize: 40, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurfaceVariant, marginRight: 8 },
  amountInput: { fontSize: 48, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, minWidth: 100 },
  titleInput: { fontSize: 18, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontFamily: theme.fonts.bodyBold, color: theme.colors.outline, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerHigh, padding: 16, borderRadius: 16 },
  selectorText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onSurface },
  splitRow: { flexDirection: 'row', gap: 12 },
  splitBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, alignItems: 'center' },
  splitBtnText: { fontSize: 14, fontFamily: theme.fonts.bodyBold, color: theme.colors.onSurfaceVariant },
  dynamicInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerHigh, padding: 16, borderRadius: 16, marginTop: 16 },
  dynamicLabel: { fontSize: 16, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface },
  dynamicInput: { fontSize: 18, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, minWidth: 60, textAlign: 'right' },
  saveBtn: { backgroundColor: theme.colors.primary, padding: 20, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  saveBtnText: { fontSize: 18, fontFamily: theme.fonts.headlineBold, color: theme.colors.onPrimary },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, minHeight: 300 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, marginBottom: 8 },
  memberImg: { width: 40, height: 40, borderRadius: 20, marginRight: 16 },
  memberName: { flex: 1, fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onSurface }
});

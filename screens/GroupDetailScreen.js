import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, Modal, TextInput, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import { collection, query, onSnapshot, doc, getDoc, updateDoc, arrayUnion, addDoc, deleteDoc } from 'firebase/firestore';
import * as Contacts from 'expo-contacts';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { theme, currencySymbol } = useTheme();
  const styles = getStyles(theme);

  const [expenses, setExpenses] = useState([]);
  const [groupData, setGroupData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [isAddMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [isViewMembersModalVisible, setViewMembersModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriendsToGroup, setSelectedFriendsToGroup] = useState([]);

  // Contact Picker State
  const [isContactPickerVisible, setContactPickerVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
    getDoc(groupRef).then(docSnap => {
      if(docSnap.exists()) {
        setGroupData(docSnap.data());
      }
    });

    const expensesRef = collection(db, 'users', auth.currentUser.uid, 'groups', groupId, 'expenses');
    const q = query(expensesRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    const friendsRef = collection(db, 'users', auth.currentUser.uid, 'friends');
    const unsubFriends = onSnapshot(query(friendsRef), (snapshot) => {
      setFriends(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => {
      unsubscribe();
      unsubFriends();
    };
  }, [groupId]);

  const toggleFriendSelection = (friendId) => {
    if (selectedFriendsToGroup.includes(friendId)) {
      setSelectedFriendsToGroup(selectedFriendsToGroup.filter(id => id !== friendId));
    } else {
      setSelectedFriendsToGroup([...selectedFriendsToGroup, friendId]);
    }
  };

  const confirmAddSelectedFriends = async () => {
    if (selectedFriendsToGroup.length === 0) return;
    const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
    await updateDoc(groupRef, {
      memberIds: arrayUnion(...selectedFriendsToGroup),
      members: (groupData?.members || 1) + selectedFriendsToGroup.length
    });
    Alert.alert("Success", `Added ${selectedFriendsToGroup.length} friends to the group!`);
    setSelectedFriendsToGroup([]);
    setAddMemberModalVisible(false);
  };

  const handleSyncContactToGroup = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      setLoadingContacts(true);
      setContactPickerVisible(true);
      setContactSearchQuery('');
      setTimeout(async () => {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        const validContacts = data.filter(c => c.name && c.name.length > 1 && !c.name.startsWith('*'));
        validContacts.sort((a,b) => a.name.localeCompare(b.name));
        setDeviceContacts(validContacts);
        setFilteredContacts(validContacts);
        setSelectedContacts([]);
        setLoadingContacts(false);
      }, 100);
    } else {
      Alert.alert("Permission required", "Allow contacts access in settings.");
    }
  };

  const confirmAddContacts = async () => {
    let addedCount = 0;
    const newFriendIds = [];
    for (const contactId of selectedContacts) {
      const contact = deviceContacts.find(c => c.id === contactId);
      if (contact) {
        const friendRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), {
          name: contact.name, 
          phone: contact.phoneNumbers?.[0]?.number || '',
          amount: 0, 
          status: 'Settled Up', 
          img: `https://i.pravatar.cc/150?u=${contact.name.replace(/ /g, '')}`
        });
        newFriendIds.push(friendRef.id);
        addedCount++;
      }
    }
    
    if (newFriendIds.length > 0) {
      const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
      await updateDoc(groupRef, {
        memberIds: arrayUnion(...newFriendIds),
        members: (groupData?.members || 1) + newFriendIds.length
      });
    }

    setContactPickerVisible(false);
    setAddMemberModalVisible(false);
    Alert.alert("Success", `Imported ${addedCount} contacts and added them to the group!`);
  };

  const handleSettleUp = () => {
    // Generate UPI Link (India First Requirement)
    const upiId = "example@upi";
    const amount = Math.abs(groupData?.balance || 0);
    const upiUrl = `upi://pay?pa=${upiId}&pn=SpendWise&am=${amount}&cu=INR`;
    
    Alert.alert(
      "Settle Up", 
      `Settle ${currencySymbol}${amount.toFixed(2)}?\n\nIf you were on a physical device, this could open UPI apps using:\n${upiUrl}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Settled", onPress: async () => {
            const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
            await updateDoc(groupRef, { balance: 0 });
            setGroupData({...groupData, balance: 0});
            Alert.alert("Success", "Debt marked as settled!");
        }}
      ]
    );
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      "Delete Group",
      "Are you sure you want to delete this group? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const groupRef = doc(db, 'users', auth.currentUser.uid, 'groups', groupId);
              await deleteDoc(groupRef);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete group');
            }
          }
        }
      ]
    );
  };

  const renderExpense = ({ item }) => (
    <View style={styles.expenseCard}>
      <View style={styles.expenseLeft}>
        <View style={styles.expenseIcon}>
          <Ionicons name="receipt" size={24} color={theme.colors.onSurfaceVariant} />
        </View>
        <View>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Text style={styles.expenseSub}>{item.paidBy === auth.currentUser.uid ? 'You paid' : 'Someone paid'} • {item.splitType}</Text>
        </View>
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>{currencySymbol}{item.amount.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={{alignItems: 'center'}}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <TouchableOpacity onPress={() => setViewMembersModalVisible(true)}>
            <Text style={{fontSize: 12, fontFamily: theme.fonts.bodyBold, color: theme.colors.primary, marginTop: 4}}>
              View {groupData?.members || 1} Members
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setAddMemberModalVisible(true)} style={styles.headerRight}>
            <Ionicons name="person-add-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteGroup} style={styles.headerRight}>
            <Ionicons name="trash-outline" size={24} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Balance in Group</Text>
        <Text style={[styles.balanceAmount, { color: groupData?.balance >= 0 ? theme.colors.primaryContainer : theme.colors.tertiary }]}>
          {groupData?.balance >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(groupData?.balance || 0).toFixed(2)}
        </Text>
        <TouchableOpacity style={styles.settleBtn} onPress={handleSettleUp}>
          <Text style={styles.settleBtnText}>Settle Up via UPI</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.expensesContainer}>
        <Text style={styles.sectionTitle}>Group Expenses</Text>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet. Tap + to add one!</Text>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={item => item.id}
            renderItem={renderExpense}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('AddSplitExpense', { 
          groupId, 
          groupName,
          groupMembers: friends.filter(f => groupData?.memberIds?.includes(f.id))
        })}
      >
        <Ionicons name="add" size={32} color={theme.colors.onPrimaryContainer} />
      </TouchableOpacity>

      {/* Add Member Modal */}
      <Modal visible={isAddMemberModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Group</Text>
              <TouchableOpacity onPress={() => setAddMemberModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.syncContactBtn} onPress={handleSyncContactToGroup}>
              <Ionicons name="book-outline" size={20} color={theme.colors.onPrimaryContainer} />
              <Text style={styles.syncContactText}>Import from Device Contacts</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TextInput
              style={styles.searchInput}
              placeholder="Search your friends..."
              placeholderTextColor={theme.colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={{maxHeight: 300}}>
              {friends.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).map(friend => {
                const isAlreadyInGroup = groupData?.memberIds?.includes(friend.id);
                const isSelected = selectedFriendsToGroup.includes(friend.id);
                return (
                  <TouchableOpacity 
                    key={friend.id} 
                    style={[styles.friendRow, isAlreadyInGroup && { opacity: 0.5 }, isSelected && { backgroundColor: theme.colors.surfaceContainerHigh }]}
                    onPress={() => isAlreadyInGroup ? null : toggleFriendSelection(friend.id)}
                    disabled={isAlreadyInGroup}
                  >
                    <Image source={{ uri: friend.img }} style={styles.friendImg} />
                    <Text style={styles.friendName}>{friend.name}</Text>
                    {isAlreadyInGroup ? (
                      <Text style={{fontSize: 12, color: theme.colors.primary}}>Joined</Text>
                    ) : (
                      <Ionicons 
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={isSelected ? theme.colors.primary : theme.colors.outlineVariant} 
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedFriendsToGroup.length > 0 && (
              <TouchableOpacity style={styles.confirmAddBtn} onPress={confirmAddSelectedFriends}>
                <Text style={styles.confirmAddBtnText}>Add {selectedFriendsToGroup.length} Selected Friends</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* View Members Modal */}
      <Modal visible={isViewMembersModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 200, paddingBottom: 24 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group Members</Text>
              <TouchableOpacity onPress={() => setViewMembersModalVisible(false)}>
                <Ionicons name="close" size={28} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{maxHeight: 300}}>
              {/* You (The Current User) */}
              <View style={styles.friendRow}>
                <Image source={{ uri: `https://i.pravatar.cc/150?u=${auth.currentUser?.uid}` }} style={styles.friendImg} />
                <Text style={styles.friendName}>You</Text>
                <Text style={{fontSize: 12, color: theme.colors.outline}}>Admin</Text>
              </View>

              {/* Other Members */}
              {friends.filter(f => groupData?.memberIds?.includes(f.id)).map(friend => (
                <View key={friend.id} style={styles.friendRow}>
                  <Image source={{ uri: friend.img }} style={styles.friendImg} />
                  <Text style={styles.friendName}>{friend.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Contact Picker Modal */}
      <Modal visible={isContactPickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%', marginTop: 60 }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={styles.modalTitle}>Select Contacts</Text>
              <TouchableOpacity onPress={() => setContactPickerVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Search contacts..."
              placeholderTextColor={theme.colors.outline}
              value={contactSearchQuery}
              onChangeText={(text) => {
                setContactSearchQuery(text);
                if (text.trim() === '') {
                  setFilteredContacts(deviceContacts);
                } else {
                  setFilteredContacts(deviceContacts.filter(c => c.name.toLowerCase().includes(text.toLowerCase())));
                }
              }}
            />
            
            {loadingContacts ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{marginTop: 50}} />
            ) : (
              <>
                <FlatList
                  data={filteredContacts}
                  keyExtractor={item => item.id}
                  initialNumToRender={20}
                  maxToRenderPerBatch={20}
                  windowSize={5}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: contact }) => {
                    const isSelected = selectedContacts.includes(contact.id);
                    return (
                      <TouchableOpacity 
                        style={[styles.memberSelectRow, isSelected && { backgroundColor: theme.colors.surfaceContainerHighest }]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                          } else {
                            setSelectedContacts([...selectedContacts, contact.id]);
                          }
                        }}
                      >
                        <View style={[styles.memberSelectImg, { backgroundColor: theme.colors.primaryContainer, justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{color: theme.colors.onPrimaryContainer, fontFamily: theme.fonts.headlineBold}}>{contact.name.charAt(0)}</Text>
                        </View>
                        <View style={{flex: 1}}>
                          <Text style={styles.memberSelectName}>{contact.name}</Text>
                          <Text style={{fontSize: 12, color: theme.colors.outline}}>{contact.phoneNumbers?.[0]?.number}</Text>
                        </View>
                        {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity 
                  style={[styles.confirmAddBtn, { marginTop: 16, opacity: selectedContacts.length > 0 ? 1 : 0.5 }]} 
                  disabled={selectedContacts.length === 0}
                  onPress={confirmAddContacts}
                >
                  <Text style={styles.confirmAddBtnText}>Add {selectedContacts.length} Contacts to Group</Text>
                </TouchableOpacity>
              </>
            )}
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
  headerRight: { padding: 8 },
  balanceCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    margin: 20, padding: 24, borderRadius: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
  },
  balanceLabel: { fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurfaceVariant, marginBottom: 8 },
  balanceAmount: { fontSize: 36, fontFamily: theme.fonts.headlineBold },
  settleBtn: {
    marginTop: 20, backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 99
  },
  settleBtnText: { color: theme.colors.onPrimary, fontFamily: theme.fonts.bodyBold, fontSize: 16 },
  expensesContainer: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 16 },
  emptyText: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40 },
  expenseCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center' },
  expenseIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceContainerHigh, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  expenseTitle: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 4 },
  expenseSub: { fontSize: 12, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurfaceVariant },
  expenseRight: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  fab: {
    position: 'absolute', bottom: 30, right: 30,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: theme.colors.primaryContainer, shadowOffset: {width: 0, height: 8}, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: theme.colors.surfaceContainerLowest, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  syncContactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryContainer, padding: 16, borderRadius: 16, marginBottom: 20 },
  syncContactText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onPrimaryContainer, marginLeft: 8 },
  divider: { height: 1, backgroundColor: theme.colors.outlineVariant, marginBottom: 20 },
  searchInput: { borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: theme.fonts.body, color: theme.colors.onSurface, marginBottom: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  friendImg: { width: 40, height: 40, borderRadius: 20, marginRight: 16 },
  friendName: { flex: 1, fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onSurface },
  confirmAddBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  confirmAddBtnText: { fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onPrimary },
  
  memberSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  memberSelectImg: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  memberSelectName: { flex: 1, fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface },
  modalInput: { borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: theme.fonts.body, color: theme.colors.onSurface, marginBottom: 16 },
});

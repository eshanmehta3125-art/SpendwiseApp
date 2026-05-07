import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Image, Platform, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import * as Contacts from 'expo-contacts';

const { width } = Dimensions.get('window');

export default function SplitManagerScreen({ navigation }) {
  const { theme, currencySymbol, isDarkMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  
  useEffect(() => {
    if (!auth.currentUser) return;
    const groupsRef = collection(db, 'users', auth.currentUser.uid, 'groups');
    const friendsRef = collection(db, 'users', auth.currentUser.uid, 'friends');
    
    const unsubGroups = onSnapshot(query(groupsRef), (snap) => setGroups(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubFriends = onSnapshot(query(friendsRef), (snap) => setFriends(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { 
      unsubGroups(); 
      unsubFriends(); 
    };
  }, []);

  // Compute effective friend balances including group balances
  const computedFriends = friends.map(friend => {
    let effectiveAmount = friend.amount || 0;
    groups.forEach(g => {
      if (g.memberIds && g.memberIds.includes(friend.id)) {
        effectiveAmount += (g.balance || 0) / Math.max(1, g.memberIds.length);
      }
    });
    return { ...friend, effectiveAmount };
  });

  const totalOwedToYou = groups.filter(g => (g.balance || 0) > 0).reduce((acc, g) => acc + g.balance, 0) + computedFriends.filter(f => f.effectiveAmount > 0).reduce((acc, f) => acc + f.effectiveAmount, 0);
  const totalYouOwe = groups.filter(g => (g.balance || 0) < 0).reduce((acc, g) => acc + Math.abs(g.balance), 0) + computedFriends.filter(f => f.effectiveAmount < 0).reduce((acc, f) => acc + Math.abs(f.effectiveAmount), 0);
  const peopleOwingYou = computedFriends.filter(f => f.effectiveAmount > 0).length + groups.filter(g => (g.balance || 0) > 0).length;

  const [isFriendModalVisible, setFriendModalVisible] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const [isContactPickerVisible, setContactPickerVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const handleAddFriend = async () => {
    if (Platform.OS === 'web') {
      const name = window.prompt("Enter friend's name:");
      if (name) {
        addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), {
          name, amount: 0, status: 'Settled Up', img: `https://i.pravatar.cc/150?u=${name}`
        });
      }
      return;
    }

    Alert.alert(
      "Add Friend",
      "How would you like to add a friend?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sync Contacts", 
          onPress: async () => {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
              setLoadingContacts(true);
              setContactPickerVisible(true);
              setContactSearchQuery('');
              // Fetch contacts asynchronously
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
          }
        },
        { 
          text: "Enter Name", 
          onPress: () => {
            setNewFriendName('');
            setFriendModalVisible(true);
          }
        }
      ]
    );
  };

  const confirmAddFriend = () => {
    if (newFriendName.trim()) {
      addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), {
        name: newFriendName.trim(), amount: 0, status: 'Settled Up', img: `https://i.pravatar.cc/150?u=${newFriendName.trim()}`
      });
    }
    setFriendModalVisible(false);
  };

  const confirmAddContacts = async () => {
    for (const contactId of selectedContacts) {
      const contact = deviceContacts.find(c => c.id === contactId);
      if (contact) {
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), {
          name: contact.name, 
          phone: contact.phoneNumbers?.[0]?.number || '',
          amount: 0, 
          status: 'Settled Up', 
          img: `https://i.pravatar.cc/150?u=${contact.name.replace(/ /g, '')}`
        });
      }
    }
    setContactPickerVisible(false);
    Alert.alert("Success", `Added ${selectedContacts.length} friends!`);
  };

  const [isGroupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [isManageFriendsModalVisible, setManageFriendsModalVisible] = useState(false);

  // Friend Detail Modal State
  const [isFriendDetailVisible, setFriendDetailVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  
  // Summary Modal State
  const [isSummaryModalVisible, setSummaryModalVisible] = useState(false);
  const [summaryType, setSummaryType] = useState('owedToYou'); // 'owedToYou' or 'youOwe'
  
  // Add Expense to Friend State
  const [isAddExpenseVisible, setAddExpenseVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  
  // Friend History State
  const [friendExpenses, setFriendExpenses] = useState([]);
  const [isFriendHistoryVisible, setFriendHistoryVisible] = useState(false);
  const [friendExpensesUnsubscribe, setFriendExpensesUnsubscribe] = useState(null);

  // View All Groups State
  const [isAllGroupsVisible, setAllGroupsVisible] = useState(false);

  const handleCreateGroup = () => {
    if (Platform.OS === 'web') {
      const name = window.prompt("Enter group name:");
      if (name) {
        addDoc(collection(db, 'users', auth.currentUser.uid, 'groups'), {
          name, type: 'Active', members: 1, icon: 'people', color: 'primary', balance: 0, memberIds: []
        });
      }
    } else {
      setNewGroupName('');
      setSelectedGroupMembers([]);
      setGroupModalVisible(true);
    }
  };

  const confirmCreateGroup = () => {
    if (newGroupName.trim()) {
      addDoc(collection(db, 'users', auth.currentUser.uid, 'groups'), {
        name: newGroupName.trim(), 
        type: 'Active', 
        members: 1 + selectedGroupMembers.length, 
        memberIds: selectedGroupMembers,
        icon: 'people', 
        color: 'primary', 
        balance: 0
      });
    }
    setGroupModalVisible(false);
  };

  const openFriendDetail = (friend) => {
    setSelectedFriend(friend);
    setFriendDetailVisible(true);
    setFriendHistoryVisible(false);
    setAddExpenseVisible(false);
    
    // Subscribe to expenses history
    const expensesRef = collection(db, 'users', auth.currentUser.uid, 'friends', friend.id, 'expenses');
    const unsub = onSnapshot(query(expensesRef), (snapshot) => {
      setFriendExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
    });
    setFriendExpensesUnsubscribe(() => unsub);
  };

  const closeFriendDetail = () => {
    if (friendExpensesUnsubscribe) friendExpensesUnsubscribe();
    setFriendDetailVisible(false);
    setSelectedFriend(null);
  };

  const handleAddFriendExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (!amt || isNaN(amt) || !selectedFriend) return;

    try {
      // Split 50/50 - you paid, so they owe you half
      const splitAmount = amt / 2;
      const friendRef = doc(db, 'users', auth.currentUser.uid, 'friends', selectedFriend.id);
      
      const friendExpensesRef = collection(db, 'users', auth.currentUser.uid, 'friends', selectedFriend.id, 'expenses');
      await addDoc(friendExpensesRef, {
         title: expenseDesc || 'Expense',
         amount: amt,
         splitAmount: splitAmount,
         paidBy: 'You',
         createdAt: Date.now()
      });

      await updateDoc(friendRef, {
        amount: increment(splitAmount)
      });
      setAddExpenseVisible(false);
      setExpenseAmount('');
      setExpenseDesc('');
      Alert.alert("Success", `Added ${expenseDesc} and split with ${selectedFriend.name}.`);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
           <Text style={styles.headerTitle}>SpendWise</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Network Summary Hero */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.heroRow}>
          <TouchableOpacity 
            style={[styles.heroCard, { backgroundColor: theme.colors.primaryContainer }]}
            activeOpacity={0.8}
            onPress={() => { setSummaryType('owedToYou'); setSummaryModalVisible(true); }}
          >
            <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.8)' }]}>Total you're owed</Text>
            <Text style={[styles.heroAmount, { color: theme.colors.onPrimaryContainer }]}>{currencySymbol}{totalOwedToYou.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <View style={styles.heroTrend}>
              <Ionicons name="trending-up" size={14} color={theme.colors.onPrimaryContainer} />
              <Text style={[styles.heroTrendText, { color: theme.colors.onPrimaryContainer }]}>FROM {peopleOwingYou} ENTITIES</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}
            activeOpacity={0.8}
            onPress={() => { setSummaryType('youOwe'); setSummaryModalVisible(true); }}
          >
            <Text style={[styles.heroLabel, { color: theme.colors.onSurfaceVariant }]}>Total you owe</Text>
            <Text style={[styles.heroAmount, { color: theme.colors.tertiary }]}>{currencySymbol}{totalYouOwe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend}>
               <Ionicons name="person-add" size={16} color={theme.colors.onPrimary} />
               <Text style={styles.addFriendBtnText}>Add Friend</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>

        {/* Active Groups */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Active Groups</Text>
            <TouchableOpacity onPress={() => setAllGroupsVisible(true)}>
              <Text style={styles.viewAllLink}>VIEW ALL</Text>
            </TouchableOpacity>
          </View>

          {groups.length === 0 && (
             <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>You have no active groups.</Text>
          )}

          {groups.slice(0, 3).map((group) => {
             const colorHex = group.color === 'primary' ? theme.colors.primaryContainer : theme.colors.tertiaryContainer;
             const isPositive = (group.balance || 0) >= 0;
             return (
               <TouchableOpacity 
                  key={group.id} 
                  style={styles.groupCard}
                  onPress={() => navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name })}
                  activeOpacity={0.8}
               >
                  <View style={[styles.groupBlob, { backgroundColor: colorHex + '33' }]} />
                  <View style={styles.groupTopRow}>
                     <View style={[styles.groupIconBox, { backgroundColor: colorHex }]}>
                       <Ionicons name={group.icon || 'people'} size={24} color="#fff" />
                     </View>
                     <View style={styles.groupBadge}>
                       <Text style={styles.groupBadgeText}>{group.type || 'Active'}</Text>
                     </View>
                  </View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupSub}>{group.members || 1} members • Shared</Text>
                  
                  <View style={styles.groupBottomRow}>
                    <Text style={styles.groupBottomLabel}>Your Balance</Text>
                    <Text style={[styles.groupBottomAmount, { color: isPositive ? theme.colors.primaryContainer : theme.colors.tertiary }]}>
                      {isPositive ? '+' : '-'}{currencySymbol}{Math.abs(group.balance || 0).toFixed(2)}
                    </Text>
                  </View>
               </TouchableOpacity>
             )
          })}
          
          <TouchableOpacity style={styles.createGroupBtn} onPress={handleCreateGroup}>
             <View style={styles.createGroupIcon}>
                <Ionicons name="add" size={24} color={theme.colors.onSurfaceVariant} />
             </View>
             <Text style={styles.createGroupText}>Create New Group</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Friend Balances */}
        <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
          <View style={[styles.sectionHeaderRow, { marginTop: 32 }]}>
            <Text style={styles.sectionTitle}>Friend Balances</Text>
            <TouchableOpacity onPress={() => setManageFriendsModalVisible(true)}>
              <Text style={styles.viewAllLink}>MANAGE</Text>
            </TouchableOpacity>
          </View>
          
          {computedFriends.length === 0 ? (
             <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>You haven't added any friends yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
              {computedFriends.map(friend => {
                 const isOwed = friend.effectiveAmount > 0.01;
                 const isOweThem = friend.effectiveAmount < -0.01;
                 const isSettled = !isOwed && !isOweThem;
                 
                 let amountColor = theme.colors.onSurfaceVariant;
                 if (isOwed) amountColor = '#10b981'; // Green
                 else if (isOweThem) amountColor = isDarkMode ? theme.colors.onSurface : '#000000'; // Black/White

                 return (
                   <TouchableOpacity key={friend.id} style={styles.friendCard} onPress={() => openFriendDetail(friend)}>
                     <Image source={{ uri: friend.img }} style={styles.friendImg} />
                     <Text style={styles.friendName}>{friend.name}</Text>
                     <Text style={[styles.friendStatus, { color: amountColor }]}>
                        {isSettled ? 'Settled Up' : (isOwed ? 'Owes you' : 'You owe')}
                     </Text>
                     <Text style={[styles.friendAmount, { color: amountColor }]}>
                        {currencySymbol}{Math.abs(friend.effectiveAmount || 0).toFixed(2)}
                     </Text>
                   </TouchableOpacity>
                 )
              })}
            </ScrollView>
          )}
        </Animated.View>

      </ScrollView>

      {/* Friend Detail Modal */}
      <Modal visible={isFriendDetailVisible} transparent animationType="slide" onRequestClose={closeFriendDetail}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { marginTop: 100, height: '80%' }]}>
            {selectedFriend && (
              <>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={styles.modalTitle}>{selectedFriend.name}</Text>
                  <TouchableOpacity onPress={closeFriendDetail}>
                    <Ionicons name="close" size={28} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                </View>
                
                {!isFriendHistoryVisible && (
                  <View style={{alignItems: 'center', marginVertical: 24}}>
                    <Image source={{ uri: selectedFriend.img }} style={{width: 80, height: 80, borderRadius: 40, marginBottom: 16}} />
                    <Text style={{fontSize: 16, color: theme.colors.outline, marginBottom: 8}}>Net Balance</Text>
                    <Text style={{fontSize: 36, fontFamily: theme.fonts.headlineBold, color: selectedFriend.effectiveAmount >= 0 ? '#10b981' : (isDarkMode ? theme.colors.onSurface : '#000')}}>
                      {selectedFriend.effectiveAmount >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(selectedFriend.effectiveAmount).toFixed(2)}
                    </Text>
                  </View>
                )}

                {isAddExpenseVisible ? (
                  <View style={{backgroundColor: theme.colors.surfaceContainerHigh, padding: 16, borderRadius: 16}}>
                    <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 16}}>Add Split Expense</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Amount you paid"
                      placeholderTextColor={theme.colors.outline}
                      keyboardType="decimal-pad"
                      value={expenseAmount}
                      onChangeText={setExpenseAmount}
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="What was it for?"
                      placeholderTextColor={theme.colors.outline}
                      value={expenseDesc}
                      onChangeText={setExpenseDesc}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity onPress={() => setAddExpenseVisible(false)} style={styles.modalCancelBtn}>
                        <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleAddFriendExpense} style={styles.modalCreateBtn}>
                        <Text style={styles.modalCreateText}>Split 50/50</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isFriendHistoryVisible ? (
                  <View style={{flex: 1, marginTop: 12}}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                      <TouchableOpacity onPress={() => setFriendHistoryVisible(false)} style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} style={{marginRight: 8}} />
                        <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface}}>Back</Text>
                      </TouchableOpacity>
                      <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.outline}}>History</Text>
                    </View>
                    
                    {friendExpenses.length === 0 ? (
                      <Text style={{textAlign: 'center', color: theme.colors.outline, marginTop: 40}}>No expenses recorded yet.</Text>
                    ) : (
                      <FlatList
                        data={friendExpenses}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({item}) => (
                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant}}>
                            <View>
                              <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 4}}>{item.title}</Text>
                              <Text style={{fontSize: 12, fontFamily: theme.fonts.bodyMedium, color: theme.colors.outline}}>
                                {new Date(item.createdAt).toLocaleDateString()} • {item.paidBy === 'You' ? 'You paid' : `${selectedFriend.name} paid`}
                              </Text>
                            </View>
                            <View style={{alignItems: 'flex-end'}}>
                              <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface}}>{currencySymbol}{item.amount.toFixed(2)}</Text>
                              <Text style={{fontSize: 12, fontFamily: theme.fonts.bodyBold, color: item.paidBy === 'You' ? '#10b981' : theme.colors.tertiary}}>
                                {item.paidBy === 'You' ? 'Lent' : 'Borrowed'} {currencySymbol}{item.splitAmount.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        )}
                      />
                    )}
                  </View>
                ) : (
                  <View>
                    <TouchableOpacity 
                      style={[styles.createGroupBtn, {backgroundColor: theme.colors.primaryContainer, borderWidth: 0, marginBottom: 12, padding: 16}]}
                      onPress={() => setAddExpenseVisible(true)}
                    >
                      <Text style={{color: theme.colors.onPrimaryContainer, fontFamily: theme.fonts.headlineBold, fontSize: 16}}>Add Expense with {selectedFriend.name}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.createGroupBtn, {backgroundColor: theme.colors.surfaceContainerHighest, borderWidth: 0, padding: 16}]}
                      onPress={() => setFriendHistoryVisible(true)}
                    >
                      <Text style={{color: theme.colors.onSurface, fontFamily: theme.fonts.headlineBold, fontSize: 16}}>View History</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
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
                  style={[styles.modalCreateBtn, { marginTop: 16, paddingVertical: 16, alignItems: 'center', opacity: selectedContacts.length > 0 ? 1 : 0.5 }]} 
                  disabled={selectedContacts.length === 0}
                  onPress={confirmAddContacts}
                >
                  <Text style={styles.modalCreateText}>Add {selectedContacts.length} Contacts</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* All Groups Modal */}
      <Modal visible={isAllGroupsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { height: '90%', marginTop: 60 }]}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
               <Text style={styles.modalTitle}>All Groups</Text>
               <TouchableOpacity onPress={() => setAllGroupsVisible(false)}>
                 <Ionicons name="close" size={24} color={theme.colors.onSurface} />
               </TouchableOpacity>
             </View>
             
             <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
               {groups.length === 0 ? (
                 <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40 }}>You have no active groups.</Text>
               ) : (
                 groups.map((group) => {
                   const colorHex = group.color === 'primary' ? theme.colors.primaryContainer : theme.colors.tertiaryContainer;
                   const isPositive = (group.balance || 0) >= 0;
                   return (
                     <TouchableOpacity 
                        key={group.id} 
                        style={[styles.groupCard, { marginBottom: 16 }]}
                        onPress={() => { setAllGroupsVisible(false); navigation.navigate('GroupDetail', { groupId: group.id, groupName: group.name }); }}
                        activeOpacity={0.8}
                     >
                        <View style={[styles.groupBlob, { backgroundColor: colorHex + '33' }]} />
                        <View style={styles.groupTopRow}>
                           <View style={[styles.groupIconBox, { backgroundColor: colorHex }]}>
                             <Ionicons name={group.icon || 'people'} size={24} color="#fff" />
                           </View>
                           <View style={styles.groupBadge}>
                             <Text style={styles.groupBadgeText}>{group.type || 'Active'}</Text>
                           </View>
                        </View>
                        <Text style={styles.groupName}>{group.name}</Text>
                        <Text style={styles.groupSub}>{group.members || 1} members • Shared</Text>
                        
                        <View style={styles.groupBottomRow}>
                          <Text style={styles.groupBottomLabel}>Your Balance</Text>
                          <Text style={[styles.groupBottomAmount, { color: isPositive ? theme.colors.primaryContainer : theme.colors.tertiary }]}>
                            {isPositive ? '+' : '-'}{currencySymbol}{Math.abs(group.balance || 0).toFixed(2)}
                          </Text>
                        </View>
                     </TouchableOpacity>
                   );
                 })
               )}
             </ScrollView>
           </View>
        </View>
      </Modal>

      {/* Group Creation Modal */}
      <Modal visible={isGroupModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalSub}>Enter group name:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Goa Trip"
              placeholderTextColor={theme.colors.outline}
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />

            <Text style={[styles.modalSub, { marginTop: 8 }]}>Select members:</Text>
            <ScrollView style={{maxHeight: 150, marginBottom: 16}}>
              {friends.map(friend => {
                const isSelected = selectedGroupMembers.includes(friend.id);
                return (
                  <TouchableOpacity 
                    key={friend.id} 
                    style={[styles.memberSelectRow, isSelected && { backgroundColor: theme.colors.surfaceContainerHighest }]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== friend.id));
                      } else {
                        setSelectedGroupMembers([...selectedGroupMembers, friend.id]);
                      }
                    }}
                  >
                    <Image source={{ uri: friend.img }} style={styles.memberSelectImg} />
                    <Text style={styles.memberSelectName}>{friend.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setGroupModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCreateGroup} style={styles.modalCreateBtn}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Friend Addition Modal */}
      <Modal visible={isFriendModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Friend</Text>
            <Text style={styles.modalSub}>Enter friend's name:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. John Doe"
              placeholderTextColor={theme.colors.outline}
              value={newFriendName}
              onChangeText={setNewFriendName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setFriendModalVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmAddFriend} style={styles.modalCreateBtn}>
                <Text style={styles.modalCreateText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Modal for Managing Friends */}
      <Modal visible={isManageFriendsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={styles.modalTitle}>Manage Friends</Text>
              <TouchableOpacity onPress={() => setManageFriendsModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            {computedFriends.length === 0 ? (
              <Text style={styles.modalSub}>You have no friends to manage.</Text>
            ) : (
              <ScrollView style={{maxHeight: 300}}>
                {computedFriends.map(friend => (
                  <View key={friend.id} style={styles.memberSelectRow}>
                    <Image source={{ uri: friend.img }} style={styles.memberSelectImg} />
                    <View style={{flex: 1}}>
                      <Text style={styles.memberSelectName}>{friend.name}</Text>
                      <Text style={{fontSize: 12, color: theme.colors.outline}}>
                        Balance: {friend.effectiveAmount >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(friend.effectiveAmount || 0).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={{padding: 8}}
                      onPress={() => {
                        Alert.alert("Delete Friend", `Are you sure you want to delete ${friend.name}?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: async () => {
                              import('firebase/firestore').then(({ deleteDoc, doc }) => {
                                deleteDoc(doc(db, 'users', auth.currentUser.uid, 'friends', friend.id));
                              });
                            }
                          }
                        ])
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.tertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Summary Modal (Who owes who) */}
      <Modal visible={isSummaryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
              <Text style={styles.modalTitle}>
                {summaryType === 'owedToYou' ? "Entities Owing You" : "Entities You Owe"}
              </Text>
              <TouchableOpacity onPress={() => setSummaryModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              {/* Friends Section */}
              <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 8, marginTop: 8}}>Friends</Text>
              {computedFriends.filter(f => summaryType === 'owedToYou' ? f.effectiveAmount > 0.01 : f.effectiveAmount < -0.01).length === 0 ? (
                <Text style={{fontSize: 14, color: theme.colors.outline, marginBottom: 16}}>No friends found.</Text>
              ) : (
                computedFriends.filter(f => summaryType === 'owedToYou' ? f.effectiveAmount > 0.01 : f.effectiveAmount < -0.01).map(friend => (
                  <View key={friend.id} style={styles.memberSelectRow}>
                    <Image source={{ uri: friend.img }} style={styles.memberSelectImg} />
                    <View style={{flex: 1}}>
                      <Text style={styles.memberSelectName}>{friend.name}</Text>
                    </View>
                    <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: summaryType === 'owedToYou' ? '#10b981' : (isDarkMode ? theme.colors.onSurface : '#000')}}>
                      {currencySymbol}{Math.abs(friend.effectiveAmount).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}

              {/* Groups Section */}
              <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 8, marginTop: 16}}>Groups</Text>
              {groups.filter(g => summaryType === 'owedToYou' ? (g.balance || 0) > 0.01 : (g.balance || 0) < -0.01).length === 0 ? (
                <Text style={{fontSize: 14, color: theme.colors.outline, marginBottom: 16}}>No groups found.</Text>
              ) : (
                groups.filter(g => summaryType === 'owedToYou' ? (g.balance || 0) > 0.01 : (g.balance || 0) < -0.01).map(group => (
                  <View key={group.id} style={styles.memberSelectRow}>
                    <View style={[styles.memberSelectImg, {backgroundColor: theme.colors.primaryContainer, justifyContent: 'center', alignItems: 'center'}]}>
                      <Ionicons name={group.icon || 'people'} size={20} color={theme.colors.onPrimaryContainer} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.memberSelectName}>{group.name}</Text>
                    </View>
                    <Text style={{fontSize: 16, fontFamily: theme.fonts.headlineBold, color: summaryType === 'owedToYou' ? '#10b981' : (isDarkMode ? theme.colors.onSurface : '#000')}}>
                      {currencySymbol}{Math.abs(group.balance || 0).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: theme.glass.panelElevated.backgroundColor,
    borderBottomWidth: 1,
    borderBottomColor: theme.glass.panelElevated.borderColor,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: theme.colors.onSurface, fontSize: 28, fontFamily: theme.fonts.logo || theme.fonts.headline, letterSpacing: 0 },
  headerBtn: { padding: 4 },
  
  scrollContent: { padding: 24, paddingBottom: 120 },
  
  heroRow: {
    flexDirection: width > 400 ? 'row' : 'column',
    gap: 16,
    marginBottom: 32,
  },
  heroCard: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    minHeight: 160,
    justifyContent: 'space-between',
    marginBottom: width > 400 ? 0 : 16,
  },
  heroLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.bodyMedium,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 32,
    fontFamily: theme.fonts.headline,
  },
  heroTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  heroTrendText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBlack,
    letterSpacing: 1,
    marginLeft: 6,
  },
  addFriendBtn: {
    backgroundColor: theme.colors.onSurface,
    borderRadius: 99,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 24,
  },
  addFriendBtnText: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.bodyBold,
    marginLeft: 8,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
  },
  viewAllLink: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBlack,
    color: theme.colors.primaryContainer,
    letterSpacing: 2,
  },

  groupCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  groupBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  groupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  groupIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  groupBadgeText: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBlack,
    textTransform: 'uppercase',
    color: theme.colors.onSurfaceVariant,
  },
  groupName: {
    fontSize: 18,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  groupSub: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.outline,
    marginBottom: 20,
  },
  groupBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.outlineVariant,
  },
  groupBottomLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  groupBottomAmount: {
    fontSize: 16,
    fontFamily: theme.fonts.headline,
  },

  createGroupBtn: {
    backgroundColor: theme.colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createGroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  createGroupText: {
    fontSize: 14,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurfaceVariant,
  },

  friendCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginRight: 16,
    width: 140,
  },
  friendImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 12,
  },
  friendName: {
    fontSize: 14,
    fontFamily: theme.fonts.headlineBold,
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  friendStatus: {
    fontSize: 10,
    fontFamily: theme.fonts.bodyBlack,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  friendAmount: {
    fontSize: 18,
    fontFamily: theme.fonts.headline,
  },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 8 },
  modalSub: { fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.outline, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: theme.fonts.body, color: theme.colors.onSurface, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.outline },
  modalCreateBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  modalCreateText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onPrimary },
  
  memberSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  memberSelectImg: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  memberSelectName: { flex: 1, fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface }
});

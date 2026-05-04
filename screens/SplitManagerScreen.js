import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Dimensions, Image, Platform, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';
import { collection, query, onSnapshot, addDoc, doc } from 'firebase/firestore';
import * as Contacts from 'expo-contacts';

const { width } = Dimensions.get('window');

export default function SplitManagerScreen({ navigation }) {
  const { theme, currencySymbol } = useTheme();
  const styles = getStyles(theme);

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

  const totalOwedToYou = friends.filter(f => f.amount > 0).reduce((acc, f) => acc + f.amount, 0);
  const totalYouOwe = friends.filter(f => f.amount < 0).reduce((acc, f) => acc + Math.abs(f.amount), 0);
  const peopleOwingYou = friends.filter(f => f.amount > 0).length;

  const [isFriendModalVisible, setFriendModalVisible] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

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
              const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers],
              });
              // Filter out weird system numbers like *7 or *86
              const validContacts = data.filter(c => c.name && c.name.length > 1 && !c.name.startsWith('*'));
              
              if (validContacts.length > 0) {
                const contact = validContacts[0];
                addDoc(collection(db, 'users', auth.currentUser.uid, 'friends'), {
                  name: contact.name, 
                  phone: contact.phoneNumbers?.[0]?.number || '',
                  amount: 0, 
                  status: 'Settled Up', 
                  img: `https://i.pravatar.cc/150?u=${contact.name.replace(/ /g, '')}`
                });
                Alert.alert("Success", `Added ${contact.name} from contacts!`);
              } else {
                Alert.alert("Info", "No valid contacts found.");
              }
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

  const [isGroupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [isManageFriendsModalVisible, setManageFriendsModalVisible] = useState(false);

  const handleCreateGroup = () => {
    if (Platform.OS === 'web') {
      const name = window.prompt("Enter group name:");
      if (name) {
        addDoc(collection(db, 'users', auth.currentUser.uid, 'groups'), {
          name, type: 'Active', members: 1, icon: 'people', color: 'primary', balance: 0
        });
      }
    } else {
      setNewGroupName('');
      setSelectedGroupMembers([]);
      setGroupModalVisible(true);
    }
  };

  const toggleMemberSelection = (friendId) => {
    if (selectedGroupMembers.includes(friendId)) {
      setSelectedGroupMembers(selectedGroupMembers.filter(id => id !== friendId));
    } else {
      setSelectedGroupMembers([...selectedGroupMembers, friendId]);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
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
          <View style={[styles.heroCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Text style={[styles.heroLabel, { color: 'rgba(255,255,255,0.8)' }]}>Total you're owed</Text>
            <Text style={[styles.heroAmount, { color: theme.colors.onPrimaryContainer }]}>{currencySymbol}{totalOwedToYou.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <View style={styles.heroTrend}>
              <Ionicons name="trending-up" size={14} color={theme.colors.onPrimaryContainer} />
              <Text style={[styles.heroTrendText, { color: theme.colors.onPrimaryContainer }]}>FROM {peopleOwingYou} PEOPLE</Text>
            </View>
          </View>
          <View style={[styles.heroCard, { backgroundColor: theme.colors.surfaceContainerHigh }]}>
            <Text style={[styles.heroLabel, { color: theme.colors.onSurfaceVariant }]}>Total you owe</Text>
            <Text style={[styles.heroAmount, { color: theme.colors.tertiary }]}>{currencySymbol}{totalYouOwe.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            <TouchableOpacity style={styles.addFriendBtn} onPress={handleAddFriend}>
               <Ionicons name="person-add" size={16} color={theme.colors.onPrimary} />
               <Text style={styles.addFriendBtnText}>Add Friend</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Active Groups */}
        <Animated.View entering={FadeInDown.delay(100).duration(600).springify()}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Active Groups</Text>
            <Text style={styles.viewAllLink}>VIEW ALL</Text>
          </View>

          {groups.length === 0 && (
             <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>You have no active groups.</Text>
          )}

          {groups.map((group) => {
             const colorHex = group.color === 'primary' ? theme.colors.primaryContainer : theme.colors.tertiaryContainer;
             const isPositive = group.balance >= 0;
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
          
          {friends.length === 0 ? (
             <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>You haven't added any friends yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24 }}>
              {friends.map(friend => {
                 const isOwed = friend.amount > 0;
                 const isSettled = friend.amount === 0;
                 return (
                   <View key={friend.id} style={styles.friendCard}>
                     <Image source={{ uri: friend.img }} style={styles.friendImg} />
                     <Text style={styles.friendName}>{friend.name}</Text>
                     <Text style={[styles.friendStatus, { color: isSettled ? theme.colors.onSurfaceVariant : (isOwed ? theme.colors.primaryContainer : theme.colors.tertiary) }]}>
                        {isSettled ? 'Settled Up' : (isOwed ? 'Owes you' : 'You owe')}
                     </Text>
                     <Text style={[styles.friendAmount, { color: isSettled ? theme.colors.onSurfaceVariant : (isOwed ? theme.colors.primaryContainer : theme.colors.tertiary) }]}>
                        {currencySymbol}{Math.abs(friend.amount || 0).toFixed(2)}
                     </Text>
                   </View>
                 )
              })}
            </ScrollView>
          )}
        </Animated.View>

      </ScrollView>

      {/* Custom Modal for Android/iOS Group Creation */}
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

      {/* Custom Modal for Android/iOS Friend Addition */}
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
            
            {friends.length === 0 ? (
              <Text style={styles.modalSub}>You have no friends to manage.</Text>
            ) : (
              <ScrollView style={{maxHeight: 300}}>
                {friends.map(friend => (
                  <View key={friend.id} style={styles.memberSelectRow}>
                    <Image source={{ uri: friend.img }} style={styles.memberSelectImg} />
                    <View style={{flex: 1}}>
                      <Text style={styles.memberSelectName}>{friend.name}</Text>
                      <Text style={{fontSize: 12, color: theme.colors.outline}}>Balance: {currencySymbol}{Math.abs(friend.amount || 0)}</Text>
                    </View>
                    <TouchableOpacity 
                      style={{padding: 8}}
                      onPress={() => {
                        Alert.alert("Delete Friend", `Are you sure you want to delete ${friend.name}?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: async () => {
                              // In a real app we'd delete the doc from Firestore
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

    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
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
  profilePic: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: theme.colors.primaryContainer,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, backgroundColor: theme.colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  headerTitle: { color: theme.colors.onSurface, fontSize: 20, fontFamily: theme.fonts.headline, letterSpacing: -0.5 },
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
  modalContent: { width: '80%', backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface, marginBottom: 8 },
  modalSub: { fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.outline, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: theme.fonts.body, color: theme.colors.onSurface, marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.outline },
  modalCreateBtn: { backgroundColor: theme.colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  modalCreateText: { fontSize: 16, fontFamily: theme.fonts.bodyBold, color: theme.colors.onPrimary },
  
  memberSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4 },
  memberSelectImg: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  memberSelectName: { flex: 1, fontSize: 14, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface }
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Image, Switch, Modal, FlatList, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { theme, isDarkMode, toggleTheme, currency, updateCurrency } = useTheme();
  const styles = getStyles(theme, isDarkMode);
  
  const [userName, setUserName] = useState(auth.currentUser?.displayName || 'User');
  const [email, setEmail] = useState(auth.currentUser?.email || 'user@example.com');
  const [profileImage, setProfileImage] = useState(auth.currentUser?.photoURL || null);
  
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  
  const [currencies, setCurrencies] = useState([]);
  const [isCurrencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates) {
          setCurrencies(Object.keys(data.rates));
        }
      })
      .catch(err => console.log('Currency API Error:', err));
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.name) setUserName(data.name);
          if (data.currency) updateCurrency(data.currency);
          if (data.photoURL) setProfileImage(data.photoURL);
        }
        setEmail(auth.currentUser.email || 'alex.t@wealthflow.io');
      } catch (err) {
        console.log("Error fetching profile", err);
      }
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setProfileImage(base64Img);
        
        if (auth.currentUser) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            photoURL: base64Img
          });
        }
      }
    } catch (err) {
      console.log("Error picking image", err);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm("Are you sure you want to log out?");
      if (confirmLogout) signOut(auth);
    } else {
      Alert.alert("Logout", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: () => signOut(auth) }
      ]);
    }
  };

  const handleCurrencySelect = async (code) => {
    updateCurrency(code);
    setCurrencyModalVisible(false);
    setSearchQuery('');
    if (auth.currentUser) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { currency: code });
      } catch (err) {
        console.log("Error updating currency", err);
      }
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    try {
      if (auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          name: newName
        });
        setUserName(newName);
        setAccountModalVisible(false);
        Alert.alert("Success", "Profile name updated!");
      }
    } catch (err) {
      console.log("Error updating name", err);
      Alert.alert("Error", "Failed to update name");
    }
  };

  const filteredCurrencies = currencies.filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>SpendWise</Text>
        <TouchableOpacity style={styles.headerRight} onPress={() => navigation.navigate('Notifications')}>
           <Ionicons name="notifications" size={22} color={isDarkMode ? theme.colors.onSurfaceVariant : '#475569'} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.card}>
           <View style={styles.profileBadgeRow}>
              <View style={styles.verifiedBadge}>
                 <Ionicons name="checkmark-circle" size={12} color="#ffffff" style={{marginRight: 4}} />
                 <Text style={styles.verifiedText}>Verified</Text>
              </View>
           </View>
           <View style={styles.profileImageContainer}>
              <View style={styles.profileImageRing}>
                <View style={styles.profileImageInner}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="person" size={48} color={isDarkMode ? theme.colors.onSurfaceVariant : '#94a3b8'} />
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.editIconBadge} onPress={pickImage}>
                 <Ionicons name="pencil" size={14} color="#ffffff" />
              </TouchableOpacity>
           </View>
           <Text style={styles.profileName}>{userName}</Text>
           <Text style={styles.profileEmail}>{email}</Text>
           <TouchableOpacity 
             style={styles.accountManagerBtn}
             onPress={() => {
               setNewName(userName);
               setAccountModalVisible(true);
             }}
           >
              <Text style={styles.accountManagerText}>Account Manager</Text>
              <Ionicons name="open-outline" size={16} color="#0284c7" />
           </TouchableOpacity>
        </View>

        {/* SYSTEM PREFERENCES */}
        <View style={styles.card}>
           <Text style={styles.cardSectionTitle}>SYSTEM PREFERENCES</Text>
           
           <View style={styles.row}>
             <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e0f2fe' }]}>
                   <Ionicons name="moon" size={20} color={isDarkMode ? theme.colors.onSurface : "#0284c7"} />
                </View>
                <Text style={styles.rowLabel}>Dark Mode</Text>
             </View>
             <Switch 
                value={isDarkMode} 
                onValueChange={toggleTheme} 
                trackColor={{ false: '#e2e8f0', true: '#0284c7' }}
                thumbColor={'#ffffff'}
             />
           </View>
           
           <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Notifications')}>
             <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#ffedd5' }]}>
                   <Ionicons name="notifications" size={20} color={isDarkMode ? theme.colors.onSurface : "#c2410c"} />
                </View>
                <Text style={styles.rowLabel}>Notifications</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color={isDarkMode ? theme.colors.outline : '#64748b'} />
           </TouchableOpacity>
        </View>

        {/* FINANCE */}
        <View style={styles.card}>
           <Text style={styles.cardSectionTitle}>FINANCE</Text>
           
           <View style={styles.currencySection}>
              <Text style={styles.currencyLabel}>Change Currency</Text>
              <TouchableOpacity style={styles.currencyDropdown} onPress={() => setCurrencyModalVisible(true)}>
                 <Text style={styles.currencyValue}>{currency}</Text>
                 <Ionicons name="chevron-down" size={20} color={isDarkMode ? theme.colors.outline : '#64748b'} />
              </TouchableOpacity>
           </View>

           <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('PrivacySecurity')}>
             <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e0f2fe' }]}>
                   <Ionicons name="shield-checkmark" size={20} color={isDarkMode ? theme.colors.onSurface : "#0284c7"} />
                </View>
                <Text style={styles.rowLabel}>Privacy & Security</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color={isDarkMode ? theme.colors.outline : '#64748b'} />
           </TouchableOpacity>
        </View>

        {/* HELP & LEGAL */}
        <View style={styles.card}>
           <TouchableOpacity style={styles.row}>
             <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9' }]}>
                   <Ionicons name="help" size={20} color={isDarkMode ? theme.colors.onSurface : '#475569'} />
                </View>
                <Text style={styles.rowLabel}>Help & Support</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color={isDarkMode ? theme.colors.outline : '#64748b'} />
           </TouchableOpacity>
           
           <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]}>
             <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9' }]}>
                   <Ionicons name="document-text" size={20} color={isDarkMode ? theme.colors.onSurface : '#475569'} />
                </View>
                <Text style={styles.rowLabel}>Terms of Service</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color={isDarkMode ? theme.colors.outline : '#64748b'} />
           </TouchableOpacity>
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
           <Ionicons name="log-out-outline" size={22} color="#dc2626" style={{marginRight: 8}} />
           <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* FOOTER */}
        <Text style={styles.footerText}>VERSION 2.4.1 (SPENDWISE PRO)</Text>

      </ScrollView>

      {/* Currency Modal */}
      <Modal visible={isCurrencyModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Select Currency</Text>
                <TouchableOpacity onPress={() => { setCurrencyModalVisible(false); setSearchQuery(''); }}>
                  <Ionicons name="close" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color={theme.colors.outline} style={{ marginRight: 8 }} />
                <TextInput 
                  placeholder="Search currency..."
                  placeholderTextColor={theme.colors.outline}
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <View style={{ height: 300 }}>
                <FlatList 
                  data={filteredCurrencies}
                  keyExtractor={(item) => item}
                  renderItem={({item}) => (
                    <TouchableOpacity style={styles.currencyItem} onPress={() => handleCurrencySelect(item)}>
                      <Text style={styles.currencyItemText}>{item}</Text>
                      {currency === item && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
                    </TouchableOpacity>
                  )}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          </View>
        </Modal>

      {/* Account Manager Modal (Change Name) */}
      <Modal 
        visible={isAccountModalVisible} 
        animationType="fade" 
        transparent={true} 
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 40 }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Account Manager</Text>
                <TouchableOpacity onPress={() => setAccountModalVisible(false)}>
                  <Ionicons name="close" size={24} color={theme.colors.onSurface} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.cardSectionTitle, { marginBottom: 12 }]}>UPDATE DISPLAY NAME</Text>
              <View style={styles.searchContainer}>
                <Ionicons name="person-outline" size={18} color={theme.colors.outline} style={{ marginRight: 8 }} />
                <TextInput 
                  placeholder="Enter your name"
                  placeholderTextColor={theme.colors.outline}
                  style={styles.searchInput}
                  value={newName}
                  onChangeText={setNewName}
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateName}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

    </SafeAreaView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? theme.colors.background : '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerProfilePic: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerTitle: { color: theme.colors.onSurface, fontSize: 28, fontFamily: theme.fonts.logo || theme.fonts.headline, textAlign: 'center', flex: 2, letterSpacing: 0 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  
  scrollContent: { padding: 24, paddingBottom: 100 },

  card: {
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff',
    borderRadius: 36,
    padding: 24,
    marginBottom: 20,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },

  // Profile Specific
  profileBadgeRow: { alignItems: 'flex-end', width: '100%', marginBottom: -10, zIndex: 10 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0ea5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  verifiedText: { color: '#ffffff', fontSize: 10, fontFamily: theme.fonts.bodyBold, letterSpacing: 0.5 },
  
  profileImageContainer: { alignItems: 'center', marginBottom: 16 },
  profileImageRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: isDarkMode ? theme.colors.primaryContainer : '#e0f2fe', justifyContent: 'center', alignItems: 'center' },
  profileImageInner: { width: 92, height: 92, borderRadius: 46, backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  editIconBadge: { position: 'absolute', bottom: 0, right: '32%', backgroundColor: '#0284c7', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff' },
  
  profileName: { color: theme.colors.onSurface, fontSize: 24, fontFamily: theme.fonts.headlineBold, textAlign: 'center', marginBottom: 4 },
  profileEmail: { color: isDarkMode ? theme.colors.outline : '#64748b', fontSize: 14, fontFamily: theme.fonts.bodyMedium, textAlign: 'center', marginBottom: 20 },
  
  accountManagerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9', paddingVertical: 16, borderRadius: 24 },
  accountManagerText: { color: '#0284c7', fontSize: 14, fontFamily: theme.fonts.headlineBold, marginRight: 8 },

  // Sections
  cardSectionTitle: { color: isDarkMode ? theme.colors.outline : '#475569', fontSize: 11, fontFamily: theme.fonts.bodyBold, letterSpacing: 1.5, marginBottom: 24 },
  
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rowLabel: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },
  
  currencySection: { marginBottom: 16 },
  currencyLabel: { color: isDarkMode ? theme.colors.onSurface : '#334155', fontSize: 13, fontFamily: theme.fonts.bodyBold, marginBottom: 10 },
  currencyDropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 24 },
  currencyValue: { color: theme.colors.onSurface, fontSize: 14, fontFamily: theme.fonts.headlineBold },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16
  },
  searchInput: { 
    flex: 1, 
    height: 44, 
    fontSize: 15, 
    fontFamily: theme.fonts.bodyMedium, 
    color: theme.colors.onSurface 
  },
  currencyItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e2e8f0' },
  currencyItemText: { fontSize: 16, fontFamily: theme.fonts.bodyMedium, color: theme.colors.onSurface },
  
  saveBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: theme.fonts.headlineBold,
  },

  // Sign Out & Footer
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2', paddingVertical: 20, borderRadius: 32, marginTop: 12, marginBottom: 32 },
  signOutText: { color: '#dc2626', fontSize: 16, fontFamily: theme.fonts.headlineBold },
  
  footerText: { color: isDarkMode ? theme.colors.outline : '#94a3b8', fontSize: 10, fontFamily: theme.fonts.bodyBold, letterSpacing: 1, textAlign: 'center', marginBottom: 40 }
});

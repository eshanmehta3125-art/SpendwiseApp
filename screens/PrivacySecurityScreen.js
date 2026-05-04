import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';

export default function PrivacySecurityScreen({ navigation }) {
  const { theme, isDarkMode, isPrivacyMode, togglePrivacyMode } = useTheme();
  const styles = getStyles(theme, isDarkMode);

  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    if (!auth.currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setLogs(data.activityLogs || [
          { id: '1', action: 'Account Created', time: data.createdAt?.toDate().toLocaleString() || 'Recently' },
          { id: '2', action: 'Logged in', time: new Date().toLocaleString() }
        ]);
        setIsBiometricEnabled(data.biometricEnabled || false);
      }
    } catch (err) {
      console.log("Error fetching logs", err);
    }
  };

  const toggleBiometrics = async () => {
    const newValue = !isBiometricEnabled;
    setIsBiometricEnabled(newValue);
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { biometricEnabled: newValue });
    }
  };

  const handleResetData = async () => {
    const performReset = async () => {
      setLoading(true);
      try {
        const uid = auth.currentUser.uid;
        
        // Helper to delete collection items
        const collections = ['transactions', 'groups', 'friends'];
        for (const colName of collections) {
          const q = query(collection(db, 'users', uid, colName));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
          }
        }

        const msg = "All transactions, groups, and friends have been cleared.";
        Platform.OS === 'web' ? window.alert("Success: " + msg) : Alert.alert("Success", msg);
      } catch (err) {
        console.log("Reset error:", err);
        const msg = "Failed to reset data: " + err.message;
        Platform.OS === 'web' ? window.alert("Error: " + msg) : Alert.alert("Error", msg);
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("RESET ALL DATA?\n\nThis will permanently delete all your transactions, groups, and friends. Your account settings and profile will remain active. This cannot be undone.")) {
        performReset();
      }
    } else {
      Alert.alert(
        "Reset All Data?",
        "This will permanently delete all your transactions, groups, and friends. Your account will remain active.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset Everything", style: "destructive", onPress: performReset }
        ]
      );
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users', auth.currentUser.uid, 'transactions'));
      const snap = await getDocs(q);
      const txns = snap.docs.map(d => d.data());
      
      const csv = "Date,Description,Amount,Type,Category\n" + 
        txns.map(t => `${t.date},"${t.desc}",${t.amount},${t.type},${t.category}`).join("\n");
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'SpendWise_Data_Export.csv';
        a.click();
      } else {
        Alert.alert("Export Ready", "Your transaction history has been compiled. In a production app, this would now open a Share sheet to save the CSV file.");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const performDeletion = async () => {
      setLoading(true);
      try {
        const uid = auth.currentUser.uid;
        const user = auth.currentUser;

        // 1. Delete sub-collections
        const collections = ['transactions', 'groups', 'friends'];
        for (const colName of collections) {
          const q = query(collection(db, 'users', uid, colName));
          const snap = await getDocs(q);
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref);
          }
        }

        // 2. Delete user doc
        await deleteDoc(doc(db, 'users', uid));

        // 3. Delete Auth
        await deleteUser(user);
        
        if (Platform.OS === 'web') {
          window.alert("Account Deleted. We're sorry to see you go.");
        } else {
          Alert.alert("Account Deleted", "We're sorry to see you go.");
        }
      } catch (err) {
        console.log("Delete error:", err);
        if (err.code === 'auth/requires-recent-login') {
          const msg = "For your protection, please sign out and sign back in before deleting your account.";
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Security Notice", msg);
        } else {
          await signOut(auth);
          const msg = "Your data has been removed and you have been signed out.";
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Account Closed", msg);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("DELETE ACCOUNT FOREVER?\n\nThis is permanent. All your data will be wiped and your account will be closed forever. This cannot be undone.")) {
        performDeletion();
      }
    } else {
      Alert.alert(
        "Delete Account?",
        "This is permanent. All your data will be wiped and your account will be closed forever.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete Forever", style: "destructive", onPress: performDeletion }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ACCESS CONTROL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCESS CONTROL</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
                  <Ionicons name="finger-print" size={20} color="#0284c7" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Biometric Lock</Text>
                  <Text style={styles.rowSub}>Require FaceID/Fingerprint</Text>
                </View>
              </View>
              <Switch value={isBiometricEnabled} onValueChange={toggleBiometrics} />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
                  <Ionicons name="eye-off" size={20} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Privacy Mode</Text>
                  <Text style={styles.rowSub}>Mask balances on dashboard</Text>
                </View>
              </View>
              <Switch value={isPrivacyMode} onValueChange={togglePrivacyMode} />
            </View>
          </View>
        </View>

        {/* DATA MANAGEMENT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={handleExportData}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#fff7ed' }]}>
                  <Ionicons name="download" size={20} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Export My Data</Text>
                  <Text style={styles.rowSub}>Download transactions as CSV</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.outline} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={handleResetData}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: '#fef2f2' }]}>
                  <Ionicons name="refresh" size={20} color="#dc2626" />
                </View>
                <View>
                  <Text style={styles.rowLabel}>Reset All Data</Text>
                  <Text style={styles.rowSub}>Wipe transactions & history</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECURITY LOGS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY LOGS</Text>
          <View style={styles.card}>
            {logs.map((log, i) => (
              <View key={log.id} style={[styles.row, i === logs.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceContainerHighest, width: 32, height: 32 }]}>
                    <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.rowLabel, { fontSize: 14 }]}>{log.action}</Text>
                    <Text style={styles.rowSub}>{log.time}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* DANGER ZONE */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color="#dc2626" style={{ marginRight: 8 }} />
          <Text style={styles.deleteBtnText}>Close Account Forever</Text>
        </TouchableOpacity>

      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme, isDarkMode) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDarkMode ? theme.colors.background : '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.fonts.headlineBold, color: theme.colors.onSurface },
  scrollContent: { padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontFamily: theme.fonts.bodyBold, color: theme.colors.outline, letterSpacing: 1.5, marginBottom: 12 },
  card: {
    backgroundColor: isDarkMode ? theme.colors.surfaceContainerHigh : '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: isDarkMode ? 0 : 1,
    borderColor: '#f1f5f9',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rowLabel: { color: theme.colors.onSurface, fontSize: 16, fontFamily: theme.fonts.headlineBold },
  rowSub: { color: theme.colors.outline, fontSize: 12, fontFamily: theme.fonts.bodyMedium },
  divider: { height: 1, backgroundColor: isDarkMode ? theme.colors.surfaceContainerHighest : '#f1f5f9' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 40
  },
  deleteBtnText: { color: '#dc2626', fontSize: 14, fontFamily: theme.fonts.headlineBold },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }
});

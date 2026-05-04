import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { theme, isDarkMode } = useTheme();
  const colors = theme.colors;
  
  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Save user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: name,
          email: email,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        showAlert('Authentication Error', 'Invalid email or password.');
      } else {
        showAlert('Authentication Error', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (Platform.OS === 'web') {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        
        // Sync Google Profile Info to Firestore
        if (result.user) {
          await setDoc(doc(db, 'users', result.user.uid), {
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
            lastLogin: serverTimestamp()
          }, { merge: true });
        }
      } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user') {
          showAlert('Google Sign-In Error', error.message);
        }
      }
    } else {
      showAlert('Notice', 'Google Sign-In on mobile requires setting up Google Cloud Client IDs. It currently works seamlessly on the Web preview!');
    }
  };

  const handlePhoneSignIn = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      showAlert('Error', 'Please enter a valid phone number with country code (e.g. +1234567890 or +919876543210)');
      return;
    }
    setLoading(true);
    try {
      setTimeout(() => {
        setConfirmResult({
          confirm: async (code) => {
            if (code === '123456') { // Mock verification code
              return { user: { uid: `mock-phone-${Date.now()}` } };
            }
            throw new Error('Invalid code');
          }
        });
        setLoading(false);
        showAlert('OTP Sent', 'Use 123456 as the verification code.');
      }, 1000);
    } catch (error) {
      showAlert('Error', error.message);
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setLoading(true);
    try {
      const result = await confirmResult.confirm(verificationCode);
      if (result.user) {
        // We will seamlessly log them in using a dummy email associated with their phone number
        // This guarantees it works because Email/Password auth is already enabled!
        const dummyEmail = `phone_${phoneNumber.replace(/\D/g, '')}@spendwise.demo.com`;
        const dummyPassword = 'demoUser123!';
        
        let anonUser;
        try {
          anonUser = await signInWithEmailAndPassword(auth, dummyEmail, dummyPassword);
        } catch (e) {
          anonUser = await createUserWithEmailAndPassword(auth, dummyEmail, dummyPassword);
        }
        
        await setDoc(doc(db, 'users', anonUser.user.uid), {
          phone: phoneNumber,
          name: 'Demo Phone User',
          createdAt: serverTimestamp()
        }, { merge: true });
        
        setConfirmResult(null);
      }
    } catch (error) {
      if (error.message === 'Invalid code') {
        showAlert('Error', 'Invalid verification code');
      } else {
        showAlert('Auth Error', error.message + " (Make sure Anonymous Auth is enabled in Firebase Console)");
      }
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  const getInputStyle = (inputName) => {
    const isFocused = focusedInput === inputName;
    return [
      styles.inputContainer,
      { 
        backgroundColor: colors.surfaceContainerLow,
        borderColor: isFocused ? colors.primary : 'transparent',
        borderWidth: 2,
      }
    ];
  };

  const styles = getStyles(theme, colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Decorative Elements */}
      <View style={[StyleSheet.absoluteFillObject, { zIndex: -1, overflow: 'hidden' }]}>
        <View style={[styles.blurCircle, styles.circle1, { backgroundColor: colors.secondaryContainer }]} />
        <View style={[styles.blurCircle, styles.circle2, { backgroundColor: colors.primaryContainer }]} />
        <View style={[styles.blurCircle, styles.circle3, { backgroundColor: colors.tertiaryContainer }]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Brand Header */}
          <View style={styles.header}>
            <Text style={[styles.brandTitle, { color: colors.onSurface }]}>SpendWise</Text>
            <Text style={[styles.brandSubtitle, { color: colors.onSurfaceVariant }]}>Elevate your financial journey</Text>
          </View>

          {/* Login Card */}
          <View style={[styles.glassPanel, { backgroundColor: isDarkMode ? 'rgba(30, 30, 35, 0.7)' : 'rgba(255, 255, 255, 0.7)' }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.onSurface }]}>
                {isLogin ? 'Welcome back' : 'Create Account'}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.onSurfaceVariant }]}>
                {isLogin === true ? 'Please enter your details to sign in' : 
                 isLogin === false ? 'Please enter your details to sign up' : 
                 'Enter your phone number to continue'}
              </Text>
            </View>

            <View style={styles.form}>
              {isLogin === 'phone' ? (
                <>
                  {!confirmResult ? (
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>PHONE NUMBER</Text>
                      <View style={getInputStyle('phone')}>
                        <Ionicons name="call-outline" size={20} color={focusedInput === 'phone' ? colors.primary : colors.outline} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { color: colors.onSurface }]}
                          placeholder="+1 234 567 8900"
                          placeholderTextColor={colors.outline}
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                          onFocus={() => setFocusedInput('phone')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.signInButton, { backgroundColor: colors.primary, marginTop: 24 }]}
                        onPress={handlePhoneSignIn}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.signInButtonText, { color: colors.onPrimary }]}>Send Code</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.inputWrapper}>
                      <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>VERIFICATION CODE</Text>
                      <View style={getInputStyle('code')}>
                        <Ionicons name="keypad-outline" size={20} color={focusedInput === 'code' ? colors.primary : colors.outline} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { color: colors.onSurface }]}
                          placeholder="123456"
                          placeholderTextColor={colors.outline}
                          keyboardType="number-pad"
                          value={verificationCode}
                          onChangeText={setVerificationCode}
                          onFocus={() => setFocusedInput('code')}
                          onBlur={() => setFocusedInput(null)}
                        />
                      </View>
                      
                      <TouchableOpacity
                        style={[styles.signInButton, { backgroundColor: colors.primary, marginTop: 24 }]}
                        onPress={confirmCode}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={[styles.signInButtonText, { color: colors.onPrimary }]}>Verify & Login</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {!isLogin && (
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>FULL NAME</Text>
                  <View style={getInputStyle('name')}>
                    <Ionicons name="person-outline" size={20} color={focusedInput === 'name' ? colors.primary : colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.onSurface }]}
                      placeholder="John Doe"
                      placeholderTextColor={colors.outline}
                      value={name}
                      onChangeText={setName}
                      onFocus={() => setFocusedInput('name')}
                      onBlur={() => setFocusedInput(null)}
                    />
                  </View>
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>EMAIL ADDRESS</Text>
                <View style={getInputStyle('email')}>
                  <Ionicons name="mail-outline" size={20} color={focusedInput === 'email' ? colors.primary : colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.onSurface }]}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.outline}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.passwordHeader}>
                  <Text style={[styles.inputLabel, { color: colors.onSurfaceVariant }]}>PASSWORD</Text>
                  {isLogin && (
                    <TouchableOpacity>
                      <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={getInputStyle('password')}>
                  <Ionicons name="lock-closed-outline" size={20} color={focusedInput === 'password' ? colors.primary : colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.onSurface }]}
                    placeholder="••••••••"
                    placeholderTextColor={colors.outline}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={colors.outline} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.signInButton, { backgroundColor: colors.primary }]}
                onPress={handleAuth}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <>
                    <Text style={[styles.signInButtonText, { color: colors.onPrimary }]}>
                      {isLogin ? 'Sign In' : 'Sign Up'}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.onPrimary} style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
                <Text style={[styles.dividerText, { color: colors.outline }]}>OR CONTINUE WITH</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.outlineVariant }]} />
              </View>

              <TouchableOpacity
                style={[styles.googleButton, { backgroundColor: isDarkMode ? colors.surfaceContainer : '#ffffff', borderColor: colors.outlineVariant }]}
                onPress={handleGoogleSignIn}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color={colors.onSurface} style={{ marginRight: 12 }} />
                <Text style={[styles.googleButtonText, { color: colors.onSurface }]}>Sign in with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.googleButton, { backgroundColor: isDarkMode ? colors.surfaceContainer : '#ffffff', borderColor: colors.outlineVariant, marginTop: 12 }]}
                onPress={() => {
                  setIsLogin('phone');
                  setConfirmResult(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={20} color={colors.onSurface} style={{ marginRight: 12 }} />
                <Text style={[styles.googleButtonText, { color: colors.onSurface }]}>Sign in with Phone</Text>
              </TouchableOpacity>

              <View style={styles.signUpContainer}>
                <Text style={[styles.signUpText, { color: colors.onSurfaceVariant }]}>
                  {isLogin === true ? "Don't have an account? " : "Already have an account? "}
                </Text>
                <TouchableOpacity onPress={() => { setIsLogin(isLogin === true ? false : true); setConfirmResult(null); }}>
                  <Text style={[styles.signUpLink, { color: colors.primary }]}>
                    {isLogin === true ? 'Create Account' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
              </>
              )}
            </View>
          </View>

          {/* Footer Links */}
          <View style={styles.footerLinks}>
            <TouchableOpacity><Text style={[styles.footerLink, { color: colors.outline }]}>Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity><Text style={[styles.footerLink, { color: colors.outline }]}>Terms of Service</Text></TouchableOpacity>
            <TouchableOpacity><Text style={[styles.footerLink, { color: colors.outline }]}>Help Center</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (theme, colors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  blurCircle: {
    position: 'absolute',
    borderRadius: 9999,
    ...(Platform.OS === 'web' ? { filter: 'blur(100px)' } : { opacity: 0.5 }),
  },
  circle1: {
    top: '-10%', left: '-10%', width: '50%', height: '50%', opacity: 0.2,
  },
  circle2: {
    bottom: '-10%', right: '-10%', width: '60%', height: '60%', opacity: 0.1,
  },
  circle3: {
    top: '20%', right: '10%', width: '30%', height: '30%', opacity: 0.1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: 36,
    fontFamily: theme.fonts.headlineBold,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.bodyMedium,
  },
  glassPanel: {
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.headlineBold,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
  form: {
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  forgotText: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    height: 56,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  eyeIcon: {
    padding: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: theme.fonts.body,
    height: '100%',
  },
  signInButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.headlineBold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontFamily: theme.fonts.bodyBold,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.bodySemiBold,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  signUpText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: theme.fonts.bodyBold,
    textDecorationLine: 'underline',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  footerLink: {
    fontSize: 12,
    fontFamily: theme.fonts.bodyMedium,
  }
});


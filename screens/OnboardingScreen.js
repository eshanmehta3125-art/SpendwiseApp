import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  Dimensions, 
  SafeAreaView,
  Platform,
  Image,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  {
    id: '1',
    title: 'Master Your\nMoney',
    description: 'Experience financial freedom with elite tracking technology.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrMbY--iCEziaf2Eu8xXINtlO4D4Gzmg--or4B3coCffCN2m6bEz1foNszWLxvL84ngND_yOM1oWccgIzSH5nGQfWBM-wKgsXw8H9Pn9XVUaLwY1FdbGCFIdPNpf43uysm4a0dE6GimQwCxBW9bLrzt_pw7e1fwXsrnPSJujWNd2EaVsvTQpCCmzeDRE833aI-nkn7OtEACMX9wflea2t_DWGOsDhv7XqlnU22agbVs-wIo4PAhiOz4eT_45egnt2knqXi_pdzkaM',
    type: 'welcome',
  },
  {
    id: '2',
    title: 'Smart Insights',
    description: 'Visualize your financial health with automated charts and deep analysis. Understand where every penny goes without lifting a finger.',
    type: 'smart_insights',
  },
  {
    id: '3',
    title: 'Split with Friends',
    description: 'No more awkward math at the dinner table. Effortlessly divide bills, track who owes what, and settle up with one tap.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChOjq5fcuBXjXHJ_RC3D_GJJpO0rtBDcDNCoUe5qnoiMCOynxRrHrsP6AmEneKVVaZrPQzZYy9KtxgmWixnh67ovImFwwZBQBFES0dGE2AHJ_AVg0NxLfRIgBgCyvsqv5kx8l1DPl1s7NX2fj9K_9GBPkhCFtKpOJEbOLnOOrFXYco4WXNOlKJoTXRiO_mGXiJgDva7fRJC13qTYooW3G8TRRuDoH5KLbnG4DBoR0b81O7aAAOB3gl0zvIP5p73y7xVcSZoBg_4yY',
  },
  {
    id: '4',
    title: 'Capture Everything',
    description: 'Snap a photo of your receipt and let our AI automatically extract dates, merchants, and totals for seamless logging.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJEKecLnLM2StJXzp8G6f-ZkrC10VH2pB3b1Z6-dWRsg1eU_wQh6Fdz6wQGjgzNs0V33E-DdtgqPuAOkNA9H40gQMEehZEE3bb7a6uz2akhfrsXyQkGENOMF0F5h2qSFhN9QeTFhYf_OifSgqbEM7TNq3pgXolyR9WWpLELifxhgk4qHkpXaVTLtOBnhmzZsqTtd763AQraZqfWth0eyo01PG8gQMJ4-bqoAO5rATqPK6H_sZhftF3itmLOpppTJ1Dlj7lcwDRFq8',
  },
  {
    id: '5',
    title: 'Ready to Start?',
    description: "You're all set to take control of your financial future. Let's make every cent count toward your dreams.",
    type: 'ready_to_start',
    isLast: true,
  }
];

export default function OnboardingScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = {
    background: '#f8f9fa',
    primary: '#007aff',
    primaryLight: '#7dd3fc',
    text: '#111827',
    textMuted: '#4b5563',
    dotDefault: '#e5e7eb',
    dotActive: '#007aff',
    dotActiveLight: '#7dd3fc',
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < ONBOARDING_DATA.length) {
      flatListRef.current.scrollToOffset({ offset: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => navigation.replace('Login');
  const handleLogin = () => navigation.replace('Login');

  const onMomentumScrollEnd = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(newIndex);
  };

  const renderSmartInsights = () => (
    <View style={styles.chartPlaceholder}>
      {/* Main Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartBarContainer}>
          <View style={[styles.chartBar, { height: '40%', backgroundColor: '#74b4fd' }]} />
          <View style={[styles.chartBar, { height: '75%', backgroundColor: '#0077ce' }]} />
          <View style={[styles.chartBar, { height: '55%', backgroundColor: '#74b4fd' }]} />
          <View style={[styles.chartBar, { height: '90%', backgroundColor: '#8CE4FF' }]} />
          <View style={[styles.chartBar, { height: '65%', backgroundColor: '#74b4fd' }]} />
          <View style={[styles.chartBar, { height: '85%', backgroundColor: '#0077ce' }]} />
        </View>
        <View style={styles.chartDays}>
          <Text style={styles.dayText}>Mon</Text>
          <Text style={styles.dayText}>Tue</Text>
          <Text style={styles.dayText}>Wed</Text>
          <Text style={styles.dayText}>Thu</Text>
          <Text style={styles.dayText}>Fri</Text>
          <Text style={styles.dayText}>Sat</Text>
        </View>
        <View style={styles.chartFooter}>
          <View>
            <Text style={styles.chartFooterText}>Monthly Trend</Text>
            <Text style={styles.chartFooterValue}>+12.4%</Text>
          </View>
          <Ionicons name="trending-up" size={32} color="#005ea4" />
        </View>
      </View>
      {/* Category Card */}
      <View style={styles.tagsContainer}>
        <View style={styles.smartTagsCard}>
          <Ionicons name="pie-chart" size={24} color="#fff" />
          <View style={{ marginTop: 8 }}>
            <Text style={styles.smartTagsTitle}>Smart Tags</Text>
            <Text style={styles.smartTagsSub}>Auto-categorized spending</Text>
          </View>
        </View>
        <View style={styles.categoriesCard}>
          <View style={styles.iconOverlapGroup}>
            <View style={[styles.overlapIcon, { backgroundColor: '#0461a4', zIndex: 3 }]}><Ionicons name="restaurant" size={16} color="#fff" /></View>
            <View style={[styles.overlapIcon, { backgroundColor: '#964400', zIndex: 2, marginLeft: -12 }]}><Ionicons name="cart" size={16} color="#fff" /></View>
            <View style={[styles.overlapIcon, { backgroundColor: '#005ea4', zIndex: 1, marginLeft: -12 }]}><Ionicons name="flash" size={16} color="#fff" /></View>
          </View>
          <Text style={styles.categoriesText}>15+ Categories</Text>
        </View>
      </View>
    </View>
  );

  const renderWelcome = (item) => (
    <View style={styles.welcomeContainer}>
      <View style={styles.welcomeGlow} />
      
      <View style={styles.welcomeImageWrapper}>
        <Image source={{ uri: item.image }} style={styles.welcomeImage} resizeMode="cover" />
      </View>
      
      <Text style={styles.welcomeTitle}>{item.title}</Text>
      <Text style={styles.welcomeDescription}>{item.description}</Text>
      
      <View style={styles.welcomeFooterWrapper}>
        <Text style={styles.welcomeFooterText}>REDEFINING WEALTH MANAGEMENT</Text>
      </View>
    </View>
  );

  const renderReadyToStart = () => (
    <View style={styles.bentoContainer}>
      <View style={styles.bentoRow1}>
        <View style={styles.successCard}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={36} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Success</Text>
          <Text style={styles.successSub}>Payment Received</Text>
        </View>
        <View style={styles.growthCard}>
          <View style={styles.growthIconWrap}>
            <Ionicons name="trending-up" size={20} color="#005ea4" />
          </View>
          <View style={styles.growthTextWrap}>
            <Text style={styles.growthValue}>124%</Text>
            <Text style={styles.growthLabel}>Portfolio Growth</Text>
          </View>
        </View>
      </View>
      <View style={styles.bentoRow2}>
        <View style={styles.walletCard}>
          <Ionicons name="wallet" size={32} color="#0461a4" />
        </View>
        <View style={styles.goalCard}>
          <View style={styles.goalIconWrap}>
            <Ionicons name="server" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.goalLabel}>ACTIVE GOAL</Text>
            <Text style={styles.goalValue}>Dream Home</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSplitWithFriends = (item) => (
    <View style={styles.splitCard}>
      <LinearGradient
        colors={['#8CE4FF', '#0077ce']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.splitTopSection}
      >
        <Image 
          source={{ uri: item.image }} 
          style={styles.splitBackgroundImage} 
          resizeMode="cover"
        />
        <View style={styles.splitContentCenter}>
          <View style={styles.receiptPill}>
            <Ionicons name="receipt" size={20} color="#0077ce" />
            <Text style={styles.receiptText}>$124.50</Text>
          </View>
          <View style={styles.profilesContainer}>
            <View style={styles.profilePicWrapper}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgAbBWrUZPHumB6KG7GD_K8bKwc8Lexgrkl2XHA1M3EeISlat1igoy_sbdgEhCO-ZPCbXUxCnLIxYtUcnlhQHXSqX5pdb0MFmvaSwlcGMNK2VqDsgGbT2zgRDO4OGXCkZq4S2S2C4oAPF8XJ6BlQUOJRXC7UAbvdvQf63UVij7u145wQtQt2eCEbvIGs22uWKz5Vj-htp3O0gF9OEXJ-hcRyCg1KHH0kOyIqP_cYiCWwou_iNZJoEw98CfGjr7dKsSnEgzCqzpHPk' }} 
                style={styles.profilePicImage} 
              />
            </View>
            <View style={[styles.profilePicWrapper, { marginLeft: -12 }]}>
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnSDWLtUdkYeeBoV1uhPd25GhlTjSkA9oxJ_5BHXgPgS_BhayKOb-TljTtBDLTRNymxSlkqwaHW1SV2BoOPrMIK_koopz_s5V2PbxX1qWzCdUBNwJld9ko81ZJALwStKnrRnuZGRq_a9ODkTHZduWcOF66YbRbxZDbbTl0pp0zLeBgvevOQDwSm8OFrWBqWm3PoPXkCzM9n-T5k-XiEYw-LtroSruRswqfeCA_qtszIK1isw6kghBwwx4y306DquhK66eyy7bwHvU' }} 
                style={styles.profilePicImage} 
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.splitBottomSection}>
        <View style={styles.tagGroup}>
          <View style={styles.splitTag}>
            <Text style={styles.splitTagText}>DINING</Text>
          </View>
          <View style={[styles.splitTag, { backgroundColor: '#e0f2fe' }]}>
            <Text style={[styles.splitTagText, { color: '#0077ce' }]}>SOCIAL</Text>
          </View>
        </View>
        <Text style={styles.participantsText}>3 Participants</Text>
      </View>

      <View style={styles.strategyCard}>
        <View style={styles.strategyTop}>
          <View>
            <Text style={styles.strategyLabel}>SPLIT STRATEGY</Text>
            <Text style={styles.strategyValue}>Evenly Distributed</Text>
          </View>
          <Ionicons name="people" size={24} color="#b45309" />
        </View>
        <View style={styles.progressBarBg}>
          <View style={styles.progressBarFill} />
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'welcome') {
      return renderWelcome(item);
    }

    return (
      <View style={styles.slide}>
        <View style={styles.visualSection}>
          {item.type === 'smart_insights' ? (
            renderSmartInsights()
          ) : item.type === 'ready_to_start' ? (
            renderReadyToStart()
          ) : item.id === '3' ? (
            renderSplitWithFriends(item)
          ) : (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          {item.id === '4' ? (
            <Text style={styles.title}>
              <Text style={{ color: colors.text }}>Capture </Text>
              <Text style={{ color: colors.primaryLight }}>Everything</Text>
            </Text>
          ) : (
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          )}
          <Text style={[styles.description, { color: colors.textMuted }]}>{item.description}</Text>
          
          {item.showLogin && (
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLogin}>
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentIndex === 0 ? '#f7fafe' : colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.logoText}>SpendWise</Text>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.text }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={onMomentumScrollEnd}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => {
            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            
            const dotColor = scrollX.interpolate({
              inputRange,
              outputRange: [colors.dotDefault, (ONBOARDING_DATA[index]?.id === '4' ? colors.dotActiveLight : colors.dotActive), colors.dotDefault],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.dot, 
                  { width: dotWidth, backgroundColor: dotColor }
                ]} 
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[
            styles.button, 
            { backgroundColor: ONBOARDING_DATA[currentIndex]?.id === '4' ? colors.primaryLight : colors.dotActive }
          ]} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.buttonText, 
            { color: ONBOARDING_DATA[currentIndex]?.id === '4' ? '#000' : '#fff' }
          ]}>
            {currentIndex === ONBOARDING_DATA.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons 
            name="arrow-forward" 
            size={20} 
            color={ONBOARDING_DATA[currentIndex]?.id === '4' ? '#000' : '#fff'} 
            style={{ marginLeft: 8 }} 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 50 : 16,
    paddingBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontFamily: 'DancingScript_700Bold',
    color: '#111827',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 10,
  },
  visualSection: {
    width: width * 0.85,
    height: width * 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#4b5563',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#007aff',
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 20 : 40,
    paddingTop: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  button: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },

  // Smart Insights Card Styles
  chartPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  chartCard: {
    backgroundColor: '#f3f3f9',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(193, 198, 213, 0.3)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    paddingHorizontal: 10,
  },
  chartBar: {
    width: '14%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  chartDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 10,
  },
  dayText: {
    fontSize: 11,
    color: '#414753',
    fontFamily: 'Inter_500Medium',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(193, 198, 213, 0.2)',
    paddingTop: 16,
    marginTop: 16,
  },
  chartFooterText: {
    fontSize: 12,
    color: '#414753',
    fontFamily: 'Inter_400Regular',
  },
  chartFooterValue: {
    fontSize: 24,
    color: '#005ea4',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
  },
  tagsContainer: {
    height: 100,
  },
  smartTagsCard: {
    backgroundColor: '#0077ce',
    borderRadius: 16,
    padding: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  smartTagsTitle: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  smartTagsSub: {
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  categoriesCard: {
    backgroundColor: '#e2e2e8',
    borderRadius: 16,
    padding: 16,
    position: 'absolute',
    top: '30%',
    right: 0,
    width: '70%',
    height: 120,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  iconOverlapGroup: {
    flexDirection: 'row',
  },
  overlapIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e2e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesText: {
    color: '#191c20',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  // Ready To Start Bento Styles
  bentoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  bentoRow1: {
    flexDirection: 'row',
    height: 220,
    marginBottom: 16,
  },
  successCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    marginRight: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    transform: [{ rotate: '-3deg' }],
  },
  successIconWrap: {
    backgroundColor: '#0077ce',
    borderRadius: 24,
    padding: 8,
    marginBottom: 12,
  },
  successTitle: {
    color: '#0077ce',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  successSub: {
    color: '#414753',
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    marginTop: 4,
  },
  growthCard: {
    flex: 1.2,
    backgroundColor: '#0077ce',
    borderRadius: 24,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    transform: [{ rotate: '2deg' }],
    overflow: 'hidden',
  },
  growthIconWrap: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    alignSelf: 'flex-start',
  },
  growthTextWrap: {
    alignItems: 'flex-end',
  },
  growthValue: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    lineHeight: 36,
  },
  growthLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  bentoRow2: {
    flexDirection: 'row',
    height: 80,
  },
  walletCard: {
    width: 80,
    backgroundColor: 'rgba(116, 180, 253, 0.3)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    transform: [{ translateY: 10 }],
  },
  goalCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    transform: [{ translateY: -5 }],
  },
  goalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#bd5700',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  goalLabel: {
    color: '#414753',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalValue: {
    color: '#191c20',
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },

  // Split with Friends Styles
  splitCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 226, 232, 0.5)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  splitTopSection: {
    height: '65%',
    width: '100%',
  },
  splitBackgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  splitContentCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: '20%',
    zIndex: 10,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  receiptText: {
    color: '#0077ce',
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    marginLeft: 8,
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 30,
    marginBottom: -24, // Pull strategy card up to overlap
  },
  profilePicWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  profilePicImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  strategyCard: {
    alignSelf: 'center',
    width: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 20,
    position: 'absolute',
    top: '52%',
  },
  strategyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  strategyLabel: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#717785',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  strategyValue: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#191c20',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e2e8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '50%',
    height: '100%',
    backgroundColor: '#8CE4FF',
  },
  splitBottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '35%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tagGroup: {
    flexDirection: 'row',
  },
  splitTag: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  splitTagText: {
    color: '#005ea4',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  participantsText: {
    color: '#414753',
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    marginBottom: 6,
  },

  // Welcome Screen (Screen 1) Styles
  welcomeContainer: {
    width: width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: height * 0.05,
  },
  welcomeGlow: {
    position: 'absolute',
    top: 0,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    backgroundColor: '#e0f2fe',
    opacity: 0.4,
    transform: [{ translateY: -width * 0.5 }],
  },
  welcomeImageWrapper: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    zIndex: 10,
  },
  welcomeImage: {
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: 42,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 16,
    lineHeight: 48,
    zIndex: 10,
  },
  welcomeDescription: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  welcomeFooterWrapper: {
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 20 : 40,
  },
  welcomeFooterText: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#6b7280',
    letterSpacing: 2,
  },
});



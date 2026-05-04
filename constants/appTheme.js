const sharedFonts = {
  headline: 'Inter_900Black',
  headlineBold: 'Inter_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
  bodyBlack: 'Inter_900Black',
};

const tailwindColors = {
  primary: "#005ea4",
  primaryContainer: "#0077ce",
  onPrimaryContainer: "#fdfcff",
  secondary: "#0461a4",
  secondaryContainer: "#74b4fd",
  onSecondaryContainer: "#004578",
  tertiary: "#964400",
  tertiaryContainer: "#bd5700",
  onTertiaryContainer: "#fffbff",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",
  background: "#f9f9ff",
  onBackground: "#191c20",
  surface: "#f9f9ff",
  onSurface: "#191c20",
  surfaceVariant: "#e2e2e8",
  onSurfaceVariant: "#414753",
  outline: "#717785",
  outlineVariant: "#c1c6d5",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f3f3f9",
  surfaceContainer: "#ededf4",
  surfaceContainerHigh: "#e7e8ee",
  surfaceContainerHighest: "#e2e2e8",
  onPrimary: "#ffffff",
  onSecondary: "#ffffff",
  onTertiary: "#ffffff",
  onError: "#ffffff",
};

export const lightTheme = {
  colors: { ...tailwindColors },
  fonts: sharedFonts,
  glass: {
    panel: {
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.05,
      shadowRadius: 24,
      elevation: 2,
    },
    panelElevated: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.08,
      shadowRadius: 32,
      elevation: 3,
    }
  }
};

export const darkTheme = {
  // Mocking dark variants for the tailwind colors
  colors: {
    primary: "#a2c9ff",
    primaryContainer: "#004881",
    onPrimaryContainer: "#d3e4ff",
    secondary: "#9fcaff",
    secondaryContainer: "#00497e",
    onSecondaryContainer: "#d2e4ff",
    tertiary: "#ffb68c",
    tertiaryContainer: "#763400",
    onTertiaryContainer: "#ffdbc9",
    error: "#ffb4ab",
    errorContainer: "#93000a",
    onErrorContainer: "#ffdad6",
    background: "#191c20",
    onBackground: "#e2e2e8",
    surface: "#191c20",
    onSurface: "#e2e2e8",
    surfaceVariant: "#414753",
    onSurfaceVariant: "#c1c6d5",
    outline: "#8b919e",
    outlineVariant: "#414753",
    surfaceContainerLowest: "#000000",
    surfaceContainerLow: "#191c20",
    surfaceContainer: "#202429",
    surfaceContainerHigh: "#2b2f34",
    surfaceContainerHighest: "#363a3f",
    onPrimary: "#00315b",
    onSecondary: "#003258",
    onTertiary: "#502300",
    onError: "#690005",
  },
  fonts: sharedFonts,
  glass: {
    panel: {
      backgroundColor: 'rgba(25, 28, 32, 0.6)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
    },
    panelElevated: {
      backgroundColor: 'rgba(25, 28, 32, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
    }
  }
};

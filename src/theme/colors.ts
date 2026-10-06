export const palette = {
  cream: '#F7F4ED', paper: '#FFFEFA', ink: '#252C24', muted: '#616960', line: '#E8E4DA',
  forest: '#385943', leaf: '#64856A', sage: '#E4EBDD', orange: '#D87B4D', peach: '#F4E1D4',
  butter: '#E4C780', white: '#FFFFFF', dark: '#121714', darkCard: '#1C231F', darkLine: '#2C3630',
};

// Both themes share the same design: forest-green buttons and chips with white text, orange accents.
// Dark mode only darkens backgrounds, cards and lines, and lightens text so it stays readable.
// `primary` is the fill colour (buttons, selected chips, step numbers); `primaryText` is green text and icons.
// `accent` is the brand orange (the logo dot); `accentText` is orange text, icons and stars (WCAG AA on cream).

export const lightTheme = {
  background: palette.cream, surface: palette.paper, text: palette.ink, muted: palette.muted,
  line: palette.line, primary: palette.forest, primaryText: palette.forest, primarySoft: palette.sage, accent: palette.orange, accentText: '#9C4D26',
  leaf: palette.leaf, accentSoft: palette.peach, warningBg: '#F7EDDA', warningText: '#765824', dangerBg: '#FBE4E1', dangerText: '#A3231A', success: palette.forest, onPrimary: palette.white,
};

export const darkTheme: typeof lightTheme = {
  background: palette.dark, surface: palette.darkCard, text: '#F2F0E9', muted: '#A3ADA2',
  line: palette.darkLine, primary: '#3E6549', primaryText: '#9CC3A4', primarySoft: '#243328', accent: palette.orange, accentText: '#E89A70',
  leaf: '#7FA587', accentSoft: '#3B2A21', warningBg: '#35301F', warningText: '#E8CF9C', dangerBg: '#3A1F1C', dangerText: '#F2A49B', success: '#9CC3A4', onPrimary: palette.white,
};

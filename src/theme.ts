import { createTheme } from "@mui/material/styles";

// Palette from the ScrollClip logo, adapted to the Stitch "Obsidian Synth"
// direction: near-black background, layered surfaces, pill shapes, teal accent.
export const LOGO = {
  bg: "#0b0d0f",
  surface: "#14171b",
  surfaceAlt: "#1b2026",
  border: "#262c33",
  text: "#e8eaed",
  muted: "#9aa3ad",
  accent: "#4cc0ce",
  accentDark: "#0f2a2e",
  danger: "#ef5350",
};

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: LOGO.bg, paper: LOGO.surface },
    text: { primary: LOGO.text, secondary: LOGO.muted },
    primary: { main: LOGO.accent, contrastText: "#06232a" },
    secondary: { main: LOGO.accentDark },
    error: { main: LOGO.danger },
    divider: LOGO.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.02em" },
    h6: { fontWeight: 700, letterSpacing: "-0.01em" },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 18, backgroundImage: "none" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});

// "mono" is a custom typography variant; expose it through the augmentation.
declare module "@mui/material/styles" {
  interface TypographyVariants {
    mono: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    mono?: React.CSSProperties;
  }
}
declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    mono: true;
  }
}
theme.typography.mono = {
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
  fontSize: "0.75rem",
  letterSpacing: "0.04em",
};

export default theme;

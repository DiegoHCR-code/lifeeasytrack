import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#070A12",
      paper: "rgba(14, 18, 35, 0.65)",
    },
    text: {
      primary: "#EAF0FF",
      secondary: "rgba(234, 240, 255, 0.65)",
    },
    primary: { main: "#7C3AED" },   // roxo
    success: { main: "#22C55E" },   // verde
    error: { main: "#EF4444" },     // vermelho
    warning: { main: "#F97316" },   // laranja
    info: { main: "#38BDF8" },      // azul
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(","),
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h5: { fontWeight: 700, letterSpacing: -0.3 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.06)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
          backdropFilter: "blur(10px)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", borderRadius: 999 },
      },
    },
  },
});

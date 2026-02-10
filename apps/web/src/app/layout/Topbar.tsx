import {
  Box,
  Button,
  IconButton,
  InputBase,
  Typography,
} from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import AddRounded from "@mui/icons-material/AddRounded";

export default function Topbar() {
  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.00))",
        backdropFilter: "blur(10px)",
      }}
    >
      <Box>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Human Data Layer™
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your life, operating system
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            gap: 1,
            px: 1.5,
            height: 40,
            width: 360,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <SearchRounded fontSize="small" style={{ opacity: 0.7 }} />
          <InputBase
            placeholder="Search data..."
            sx={{ flex: 1, fontSize: 14 }}
          />
        </Box>

        <IconButton
          sx={{
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          <NotificationsNoneRounded />
        </IconButton>

        <Button variant="contained" startIcon={<AddRounded />}>
          New Entry
        </Button>
      </Box>
    </Box>
  );
}

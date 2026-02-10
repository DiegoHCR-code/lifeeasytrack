import { Box, IconButton, Tooltip } from "@mui/material";
import HomeRounded from "@mui/icons-material/HomeRounded";
import ShowChartRounded from "@mui/icons-material/ShowChartRounded";
import PieChartRounded from "@mui/icons-material/PieChartRounded";
import ListAltRounded from "@mui/icons-material/ListAltRounded";
import SavingsRounded from "@mui/icons-material/SavingsRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";

const items = [
  { label: "Home", icon: <HomeRounded /> },
  { label: "Insights", icon: <ShowChartRounded /> },
  { label: "Analytics", icon: <PieChartRounded /> },
  { label: "Entries", icon: <ListAltRounded /> },
  { label: "Goals", icon: <SavingsRounded /> },
];

export default function Sidebar() {
  return (
    <Box
      sx={{
        width: 72,
        px: 1,
        py: 2,
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          background: "rgba(124,58,237,0.18)",
          border: "1px solid rgba(124,58,237,0.35)",
          mb: 0.5,
        }}
      >
        <LayersRounded />
      </Box>

      {items.map((it) => (
        <Tooltip key={it.label} title={it.label} placement="right">
          <IconButton
            sx={{
              width: 46,
              height: 46,
              borderRadius: 14,
              color: "rgba(234,240,255,0.8)",
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              "&:hover": {
                backgroundColor: "rgba(124,58,237,0.12)",
                borderColor: "rgba(124,58,237,0.25)",
              },
            }}
          >
            {it.icon}
          </IconButton>
        </Tooltip>
      ))}

      <Box sx={{ flex: 1 }} />

      <Tooltip title="Help" placement="right">
        <IconButton
          sx={{
            width: 46,
            height: 46,
            borderRadius: 14,
            backgroundColor: "rgba(124,58,237,0.14)",
            border: "1px solid rgba(124,58,237,0.25)",
          }}
        >
          ?
        </IconButton>
      </Tooltip>
    </Box>
  );
}

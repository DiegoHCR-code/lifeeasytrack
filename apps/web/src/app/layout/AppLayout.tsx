import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar />
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 6, pt: 2 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

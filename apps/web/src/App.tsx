import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./app/layout/AppLayout";
import Dashboard from "./pages/Dashboard/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

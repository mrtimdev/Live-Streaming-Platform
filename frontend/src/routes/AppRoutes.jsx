import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from '../components/layout/AdminLayout';
import PublicLayout from '../components/layout/PublicLayout';
import { useAuth } from '../context/AuthContext';
import Analytics from '../pages/admin/Analytics';
import CreateStream from '../pages/admin/CreateStream';
import Dashboard from '../pages/admin/Dashboard';
import StreamDetails from '../pages/admin/StreamDetails';
import StreamManagement from '../pages/admin/StreamManagement';
import UserManagement from '../pages/admin/UserManagement';
import Login from '../pages/auth/Login';
import LiveHome from '../pages/public/LiveHome';
import WatchStream from '../pages/public/WatchStream';

function ProtectedAdminRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LiveHome />} />
        <Route path="/watch/:streamId" element={<WatchStream />} />
      </Route>

      <Route path="/login" element={<Login />} />

      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="streams" element={<StreamManagement />} />
        <Route path="streams/new" element={<CreateStream />} />
        <Route path="streams/:id" element={<StreamDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={<UserManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

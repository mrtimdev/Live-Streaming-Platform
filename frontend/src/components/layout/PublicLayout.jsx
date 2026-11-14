import { Radio, Shield } from 'lucide-react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Radio className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              LiveStream
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated && user?.role === 'ADMIN' ? (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
              >
                <Shield className="h-3.5 w-3.5 text-indigo-400" />
                Admin Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                Admin Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

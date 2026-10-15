import {
  Briefcase,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  ScanSearch,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useLogout, useSession } from '@/features/auth/session';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/match', label: 'Match Resume', icon: ScanSearch, end: false },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, end: false },
  { to: '/users', label: 'Users', icon: Users, end: false },
] as const;

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );

/** Shell for all logged-in pages: sidebar navigation (drawer on small screens) + page content. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: user } = useSession();
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate('/login', { replace: true });
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <FileSearch aria-hidden="true" className="size-4" />
        </span>
        <span className="font-semibold tracking-tight">Resume Matcher</span>
      </div>

      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink to={to} end={end} className={navLinkClass} onClick={closeMenu}>
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-slate-200 pt-4">
        <NavLink to="/profile" className={navLinkClass} onClick={closeMenu}>
          <UserRound aria-hidden="true" className="size-4" />
          <span className="min-w-0">
            <span className="block truncate">{user?.name}</span>
            <span className="block truncate text-xs font-normal text-slate-500">{user?.email}</span>
          </span>
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60"
        >
          <LogOut aria-hidden="true" className="size-4" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <span className="font-semibold tracking-tight">Resume Matcher</span>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={closeMenu}
          />
          <aside id="mobile-menu" className="relative h-full w-72 max-w-[85vw] bg-white shadow-xl">
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close menu"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}

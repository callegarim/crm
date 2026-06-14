import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Columns3,
  MessageSquare,
  Users,
  Bot,
  Settings,
} from 'lucide-react';
import { MStripe } from '@/components/ui/MStripe';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { to: '/conversations', label: 'Conversas', icon: MessageSquare },
  { to: '/contacts', label: 'Contatos', icon: Users },
];

const adminItems = [
  { to: '/agents', label: 'Agentes IA', icon: Bot },
  { to: '/settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  const isActive = (path: string) => {
    if (path === '/conversations') {
      return location.pathname.startsWith('/conversations') || location.pathname.startsWith('/chat');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-sidebar bg-canvas border-r border-hairline flex flex-col z-40">
      {/* Logo */}
      <div className="px-lg pt-lg pb-md">
        <h1 className="text-display-sm text-ink uppercase tracking-tight leading-none">
          MEGA
          <span className="text-muted ml-1 font-light">CRM</span>
        </h1>
        <MStripe className="mt-sm" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-sm py-md overflow-y-auto">
        <div className="space-y-xxs">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-sm px-md py-sm',
                'text-nav text-body transition-fast',
                'hover:text-ink hover:bg-elevated/50',
                'border-l-2 border-transparent',
                isActive(to) && 'text-ink bg-elevated/30 border-l-2 border-ink'
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="my-md border-t border-hairline" />
            <p className="px-md mb-xs text-caption text-muted uppercase tracking-machined">
              Admin
            </p>
            <div className="space-y-xxs">
              {adminItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'flex items-center gap-sm px-md py-sm',
                    'text-nav text-body transition-fast',
                    'hover:text-ink hover:bg-elevated/50',
                    'border-l-2 border-transparent',
                    isActive(to) && 'text-ink bg-elevated/30 border-l-2 border-ink'
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-lg py-md border-t border-hairline">
        <p className="text-caption text-muted">Mega CRM v1.0</p>
      </div>
    </aside>
  );
}

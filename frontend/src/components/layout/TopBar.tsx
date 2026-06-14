import { LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocketStore } from '@/stores/socketStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getInitials } from '@/lib/utils';

export default function TopBar() {
  const { user, isAdmin, logout } = useAuth();
  const isConnected = useSocketStore((s) => s.isConnected);

  return (
    <header className="h-topnav bg-canvas border-b border-hairline flex items-center justify-between px-lg">
      {/* Left: connection status */}
      <div className="flex items-center gap-sm">
        {isConnected ? (
          <div className="flex items-center gap-xs text-success">
            <Wifi className="h-4 w-4" />
            <span className="text-caption">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-xs text-warning">
            <WifiOff className="h-4 w-4" />
            <span className="text-caption">Offline</span>
          </div>
        )}
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-md">
        {/* User avatar */}
        <div className="flex items-center gap-sm">
          <div className="h-8 w-8 bg-elevated border border-hairline flex items-center justify-center">
            <span className="text-[11px] font-bold text-ink uppercase">
              {user ? getInitials(user.name) : '?'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-body-sm text-ink font-light leading-tight">
              {user?.name}
            </span>
            <Badge variant={isAdmin ? 'active' : 'default'} className="w-fit mt-0.5">
              {user?.role}
            </Badge>
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          title="Sair"
          className="h-8 w-8"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

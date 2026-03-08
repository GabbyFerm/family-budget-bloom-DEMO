import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { LogOut, Moon, Sun, BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const AppHeader = () => {
  const { signOut, isDemo } = useAuth();
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        <button onClick={() => navigate('/')} className="text-lg font-bold tracking-tight">
          Family Budget <span className="text-primary">Bloom</span>
          {isDemo && <span className="ml-2 text-xs text-muted-foreground font-normal">DEMO</span>}
        </button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/yearly')}
            title="Årsöversikt"
            className={location.pathname === '/yearly' ? 'text-primary' : ''}
          >
            <BarChart3 size={18} strokeWidth={1.5} />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} title="Byt tema">
            {isDark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} title="Logga ut">
            <LogOut size={18} strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;

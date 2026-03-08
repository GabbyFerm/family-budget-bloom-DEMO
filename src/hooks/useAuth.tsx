import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { DEMO_USER_ID, DEMO_EMAIL } from '@/lib/mockData';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isDemo: false,
  signOut: async () => {},
  loginAsDemo: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(() => localStorage.getItem('ff_demo_mode') === 'true');
  const [demoUser, setDemoUser] = useState<User | null>(null);

  useEffect(() => {
    if (isDemo) {
      setDemoUser({
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
      } as User);
      setLoading(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  const loginAsDemo = () => {
    localStorage.setItem('ff_demo_mode', 'true');
    setIsDemo(true);
  };

  const signOut = async () => {
    if (isDemo) {
      localStorage.removeItem('ff_demo_mode');
      setIsDemo(false);
      setDemoUser(null);
      return;
    }
    await supabase.auth.signOut();
  };

  const user = isDemo ? demoUser : (session?.user ?? null);

  return (
    <AuthContext.Provider value={{ session, user, loading, isDemo, signOut, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

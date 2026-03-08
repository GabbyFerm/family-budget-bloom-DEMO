import { useState } from 'react';
import { motion } from 'framer-motion';
import { hasSupabase, supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const Landing = () => {
  const { loginAsDemo } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const isDemoAccount = normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD;

      // In demo-only builds, only the mock credentials should authenticate.
      if (!hasSupabase || !supabase) {
        if (!isDemoAccount) {
          toast.error('Fel demo-uppgifter. Anvand demo-kontot som ar ifyllt.');
          return;
        }
        loginAsDemo();
        toast.success('Inloggad som demo!');
        return;
      }

      if (isDemoAccount) {
        loginAsDemo();
        toast.success('Inloggad som demo!');
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) throw error;
      toast.success('Inloggad!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Något gick fel';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold tracking-tight text-foreground"
          >
            Family Budget <span className="text-primary">Bloom</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-3 text-muted-foreground text-sm leading-relaxed"
          >
            A professional monthly forecasting tool
            <br />
            for shared household economies.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground">
                E-postadress
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="din@email.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">
                Lösenord
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-secondary/50 border-border"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Logga in
            </Button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <div>
              <button
                onClick={() => {
                  setEmail(DEMO_EMAIL);
                  setPassword(DEMO_PASSWORD);
                }}
                className="text-xs text-muted-foreground/60 hover:text-primary transition-colors"
              >
                Auto fyll i demo konto →
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Landing;

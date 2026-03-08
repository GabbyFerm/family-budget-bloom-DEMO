import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { hasSupabase, supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { formatSEK } from '@/lib/format';
import { getDemoCategories, setDemoCategories } from '@/lib/mockData';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import AppHeader from '@/components/AppHeader';

type Category = Tables<'categories'>;

const TYPES = [
  { value: 'income', label: 'Inkomst' },
  { value: 'fixed_expense', label: 'Fast utgift' },
  { value: 'variable_expense', label: 'Rörlig utgift' },
];

const Settings = () => {
  const { user, isDemo } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('fixed_expense');
  const [defaultAmount, setDefaultAmount] = useState('0');

  const fetchCategories = useCallback(async () => {
    if (!user) return;

    if (isDemo) {
      setCategories(getDemoCategories() as Category[]);
      return;
    }

    if (!hasSupabase || !supabase) return;

    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('type')
      .order('sort_order');
    if (data) setCategories(data);
  }, [user, isDemo]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openNew = () => {
    setEditingCategory(null);
    setName('');
    setType('fixed_expense');
    setDefaultAmount('0');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setType(cat.type);
    setDefaultAmount(String(cat.default_amount));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;

    if (isDemo) {
      const cats = getDemoCategories();
      if (editingCategory) {
        const idx = cats.findIndex((c) => c.id === editingCategory.id);
        if (idx >= 0) {
          cats[idx] = {
            ...cats[idx],
            name: name.trim(),
            type,
            default_amount: Number(defaultAmount) || 0,
            updated_at: new Date().toISOString(),
          };
        }
        toast.success('Kategori uppdaterad');
      } else {
        cats.push({
          id: `c-${Date.now()}`,
          user_id: user.id,
          name: name.trim(),
          type,
          default_amount: Number(defaultAmount) || 0,
          sort_order: cats.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success('Kategori skapad');
      }
      setDemoCategories(cats);
      setDialogOpen(false);
      fetchCategories();
      return;
    }

    if (!hasSupabase || !supabase) return;

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update({ name: name.trim(), type, default_amount: Number(defaultAmount) || 0 })
        .eq('id', editingCategory.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Kategori uppdaterad');
    } else {
      const { error } = await supabase.from('categories').insert({
        user_id: user.id,
        name: name.trim(),
        type,
        default_amount: Number(defaultAmount) || 0,
        sort_order: categories.length,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Kategori skapad');
    }

    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    if (isDemo) {
      const cats = getDemoCategories().filter((c) => c.id !== deletingCategory.id);
      setDemoCategories(cats);
      toast.success('Kategori borttagen');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
      return;
    }

    if (!hasSupabase || !supabase) return;

    const { error } = await supabase.from('categories').delete().eq('id', deletingCategory.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Kategori borttagen');
    setDeleteDialogOpen(false);
    setDeletingCategory(null);
    fetchCategories();
  };

  const grouped = TYPES.map((t) => ({ ...t, items: categories.filter((c) => c.type === t.value) }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Kategorier</h1>
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus size={16} strokeWidth={1.5} /> Lägg till
          </Button>
        </div>

        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.value}>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
                {group.label}
              </h2>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {group.items.map((cat) => (
                    <motion.div
                      key={cat.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="glass-card px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-xs text-muted-foreground ml-3">
                          {formatSEK(cat.default_amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(cat)}
                        >
                          <Pencil size={14} strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setDeletingCategory(cat);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {group.items.length === 0 && (
                  <p className="text-sm text-muted-foreground px-4 py-3">Inga kategorier ännu.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Redigera kategori' : 'Ny kategori'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Namn</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="T.ex. Hyra"
                />
              </div>
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Standardbelopp (SEK)</Label>
                <Input
                  type="number"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSave}>Spara</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ta bort kategori?</AlertDialogTitle>
              <AlertDialogDescription>
                Är du säker på att du vill ta bort "{deletingCategory?.name}"? Alla tillhörande
                poster kommer också att tas bort.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground"
              >
                Ta bort
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default Settings;

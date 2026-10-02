import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GROUP_COLORS = ['#1a5fa8', '#2b8ac4', '#3dadd8', '#1d7a8c', '#0d4f7c'];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    const [g, p] = await Promise.all([
      base44.entities.Group.list(),
      base44.entities.Participant.list(),
    ]);
    setGroups(g);
    setParticipants(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); };
  const openEdit = (g) => { setEditing(g); setForm({ name: g.name, description: g.description || '' }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (editing) {
      await base44.entities.Group.update(editing.id, form);
      toast.success('Grupo atualizado!');
    } else {
      const count = groups.length;
      if (count >= 5) { toast.error('Máximo de 5 grupos permitido'); return; }
      await base44.entities.Group.create({ ...form, color: GROUP_COLORS[count] });
      toast.success('Grupo criado!');
    }
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Tem certeza que deseja apagar este grupo?')) return;
    await base44.entities.Group.delete(id);
    toast.success('Grupo apagado!');
    load();
  };

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(213,87%,28%)' }}>Grupos</h1>
          <p className="text-muted-foreground text-sm">{groups.length}/5 grupos cadastrados</p>
        </div>
        {groups.length < 5 && (
          <Button onClick={openCreate} style={{ background: 'hsl(213,87%,28%)' }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Grupo
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((g, i) => {
          const color = GROUP_COLORS[i % GROUP_COLORS.length];
          const members = participants.filter(p => p.group_id === g.id);
          const isExpanded = expanded[g.id];
          return (
            <div key={g.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="h-2" style={{ backgroundColor: color }} />
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: color }}>
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{g.name}</h3>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(g.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{members.length}/10 participantes</span>
                  </div>
                  {members.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(g.id)} className="text-xs">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Ocultar' : 'Ver membros'}
                    </Button>
                  )}
                </div>

                {isExpanded && members.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-border pt-3">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-sm py-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {m.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3 bg-muted rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ backgroundColor: color, width: `${(members.length / 10) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            Nenhum grupo cadastrado. Crie até 5 grupos.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Grupo</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Grupo Alpha" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do grupo" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} style={{ background: 'hsl(213,87%,28%)' }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const GROUP_COLORS = ['#1a5fa8', '#2b8ac4', '#3dadd8', '#1d7a8c', '#0d4f7c'];

export default function Participants() {
  const [participants, setParticipants] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', group_id: '', group_name: '' });
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const load = async () => {
    const [p, g] = await Promise.all([
      base44.entities.Participant.list(),
      base44.entities.Group.list(),
    ]);
    setParticipants(p);
    setGroups(g);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', group_id: '', group_name: '' }); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, group_id: p.group_id || '', group_name: p.group_name || '' }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (!form.group_id) { toast.error('Selecione um grupo'); return; }

    // Check group capacity
    const groupMembers = participants.filter(p => p.group_id === form.group_id && (!editing || p.id !== editing.id));
    if (groupMembers.length >= 10) { toast.error('Grupo já atingiu o limite de 10 participantes'); return; }

    const selectedGroup = groups.find(g => g.id === form.group_id);
    const data = { ...form, group_name: selectedGroup?.name || '' };

    if (editing) {
      await base44.entities.Participant.update(editing.id, data);
      toast.success('Participante atualizado!');
    } else {
      await base44.entities.Participant.create(data);
      toast.success('Participante adicionado!');
    }
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Tem certeza que deseja remover este participante?')) return;
    await base44.entities.Participant.delete(id);
    toast.success('Participante removido!');
    load();
  };

  const filtered = participants.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchGroup = filterGroup === 'all' || p.group_id === filterGroup;
    return matchSearch && matchGroup;
  });

  const getGroupColor = (groupId) => {
    const idx = groups.findIndex(g => g.id === groupId);
    return GROUP_COLORS[idx % GROUP_COLORS.length] || '#888';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(213,87%,28%)' }}>Participantes</h1>
          <p className="text-muted-foreground text-sm">{participants.length} participantes cadastrados</p>
        </div>
        <Button onClick={openCreate} style={{ background: 'hsl(213,87%,28%)' }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Participante
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar participante..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-5 py-3 font-semibold">Nome</th>
              <th className="text-left px-5 py-3 font-semibold">Grupo</th>
              <th className="text-right px-5 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: getGroupColor(p.group_id) }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getGroupColor(p.group_id) }}>
                    {p.group_name || '—'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-12 text-muted-foreground">
                  Nenhum participante encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Participante' : 'Novo Participante'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do participante" />
            </div>
            <div>
              <Label>Montar Grupo</Label>
              <Select value={form.group_id} onValueChange={v => setForm(f => ({ ...f, group_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => {
                    const count = participants.filter(p => p.group_id === g.id && (!editing || p.id !== editing.id)).length;
                    return (
                      <SelectItem key={g.id} value={g.id} disabled={count >= 10}>
                        {g.name} ({count}/10)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
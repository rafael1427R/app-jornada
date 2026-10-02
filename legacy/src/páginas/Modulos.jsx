import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import ScoreModal from '@/components/ScoreModal';

const GROUP_COLORS = ['#1a5fa8', '#2b8ac4', '#3dadd8', '#1d7a8c', '#0d4f7c'];

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [scoreModal, setScoreModal] = useState(null); // { module, encounter }
  const [editingScore, setEditingScore] = useState(null);
  const [expandedModule, setExpandedModule] = useState({});

  const load = async () => {
    const [m, g, s] = await Promise.all([
      base44.entities.Module.list(),
      base44.entities.Group.list(),
      base44.entities.Score.list(),
    ]);
    setModules(m);
    setGroups(g);
    setScores(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ name: m.name, description: m.description || '' }); setOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    if (editing) {
      await base44.entities.Module.update(editing.id, { ...editing, ...form });
      toast.success('Módulo atualizado!');
    } else {
      await base44.entities.Module.create(form);
      toast.success('Módulo criado!');
    }
    setOpen(false);
    load();
  };

  const remove = async (id) => {
    if (!confirm('Apagar este módulo?')) return;
    await base44.entities.Module.delete(id);
    toast.success('Módulo apagado!');
    load();
  };

  const removeScore = async (id) => {
    if (!confirm('Apagar esta pontuação?')) return;
    await base44.entities.Score.delete(id);
    toast.success('Pontuação apagada!');
    load();
  };

  const getGroupColor = (groupId) => {
    const idx = groups.findIndex(g => g.id === groupId);
    return GROUP_COLORS[idx % GROUP_COLORS.length] || '#888';
  };

  const toggleModule = (id) => setExpandedModule(prev => ({ ...prev, [id]: !prev[id] }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(213,87%,28%)' }}>Módulos</h1>
          <p className="text-muted-foreground text-sm">Gerencie módulos e pontue os grupos por encontro</p>
        </div>
        <Button onClick={openCreate} style={{ background: 'hsl(213,87%,28%)' }}>
          <Plus className="w-4 h-4 mr-2" /> Novo Módulo
        </Button>
      </div>

      <div className="space-y-4">
        {modules.map((m) => {
          const isExpanded = expandedModule[m.id] !== false; // default open
          const encounters = m.encounters || [];
          return (
            <div key={m.id} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Module Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border"
                style={{ background: 'linear-gradient(90deg, hsl(213,87%,28%,0.07) 0%, hsl(200,60%,50%,0.05) 100%)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'hsl(213,87%,28%)' }}>
                    {m.name.split(' ').pop()?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground">{m.name}</h2>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleModule(m.id)}>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="p-6 space-y-6">
                  {encounters.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">Nenhum encontro configurado neste módulo.</p>
                  )}
                  {encounters.map((enc) => {
                    const encScores = scores.filter(s => s.module_id === m.id && s.encounter_number === enc.number);
                    return (
                      <div key={enc.number} className="border border-border rounded-xl overflow-hidden">
                        {/* Encounter Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                          <div>
                            <h3 className="font-semibold text-sm" style={{ color: 'hsl(213,87%,28%)' }}>
                              Encontro {enc.number} — {enc.name}
                            </h3>
                            {enc.criteria?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {enc.criteria.map((c, i) => (
                                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{c}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="sm" onClick={() => setScoreModal({ module: m, encounter: enc })}
                            style={{ background: 'hsl(213,87%,28%)' }}>
                            <Star className="w-3 h-3 mr-1" /> Pontuar
                          </Button>
                        </div>

                        {/* Scores Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/20 border-b border-border">
                                <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Grupo</th>
                                {enc.criteria?.map((c, i) => (
                                  <th key={i} className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">{c}</th>
                                ))}
                                <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">Total</th>
                                <th className="text-center px-3 py-2 font-medium text-xs text-muted-foreground">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {groups.map(g => {
                                const sc = encScores.find(s => s.group_id === g.id);
                                return (
                                  <tr key={g.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: getGroupColor(g.id) }} />
                                        <span className="font-medium text-xs">{g.name}</span>
                                      </div>
                                    </td>
                                    {enc.criteria?.map((c, i) => {
                                      const cs = sc?.criteria_scores?.find(x => x.criteria === c);
                                      return (
                                        <td key={i} className="text-center px-3 py-2 text-xs">
                                          {cs ? (
                                            <span className="font-semibold" style={{ color: 'hsl(213,87%,28%)' }}>
                                              {cs.score}/{cs.max_score}
                                            </span>
                                          ) : <span className="text-muted-foreground">—</span>}
                                        </td>
                                      );
                                    })}
                                    <td className="text-center px-3 py-2">
                                      {sc ? (
                                        <span className="font-bold text-sm" style={{ color: 'hsl(213,87%,28%)' }}>{sc.total_score}</span>
                                      ) : <span className="text-muted-foreground text-xs">—</span>}
                                    </td>
                                    <td className="text-center px-3 py-2">
                                      <div className="flex justify-center gap-1">
                                        {sc && (
                                          <>
                                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                              onClick={() => { setEditingScore(sc); setScoreModal({ module: m, encounter: enc }); }}>
                                              <Pencil className="w-3 h-3 text-muted-foreground" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeScore(sc.id)}>
                                              <Trash2 className="w-3 h-3 text-destructive" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-white rounded-2xl border border-border">
            Nenhum módulo cadastrado.
          </div>
        )}
      </div>

      {/* Module Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Módulo</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Módulo I" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição do módulo" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} style={{ background: 'hsl(213,87%,28%)' }}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Score Modal */}
      {scoreModal && (
        <ScoreModal
          module={scoreModal.module}
          encounter={scoreModal.encounter}
          groups={groups}
          existingScore={editingScore}
          onClose={() => { setScoreModal(null); setEditingScore(null); }}
          onSaved={() => { setScoreModal(null); setEditingScore(null); load(); }}
        />
      )}
    </div>
  );
}
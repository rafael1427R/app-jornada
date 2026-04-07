import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const GROUP_COLORS = ['#1a5fa8', '#2b8ac4', '#3dadd8', '#1d7a8c', '#0d4f7c'];

export default function ScoreModal({ module, encounter, groups, existingScore, onClose, onSaved }) {
  const [selectedGroup, setSelectedGroup] = useState(existingScore?.group_id || '');
  const [criteriaScores, setCriteriaScores] = useState({});
  const [notes, setNotes] = useState(existingScore?.notes || '');
  const [saving, setSaving] = useState(false);
  const [allScores, setAllScores] = useState([]);

  useEffect(() => {
    base44.entities.Score.filter({ module_id: module.id, encounter_number: encounter.number }).then(setAllScores);
  }, [module.id, encounter.number]);

  useEffect(() => {
    if (existingScore) {
      setSelectedGroup(existingScore.group_id);
      const cs = {};
      (existingScore.criteria_scores || []).forEach(x => { cs[x.criteria] = { score: x.score, max_score: x.max_score }; });
      setCriteriaScores(cs);
      setNotes(existingScore.notes || '');
    }
  }, [existingScore]);

  useEffect(() => {
    if (selectedGroup && !existingScore) {
      const existing = allScores.find(s => s.group_id === selectedGroup);
      if (existing) {
        const cs = {};
        (existing.criteria_scores || []).forEach(x => { cs[x.criteria] = { score: x.score, max_score: x.max_score }; });
        setCriteriaScores(cs);
        setNotes(existing.notes || '');
      } else {
        setCriteriaScores({});
        setNotes('');
      }
    }
  }, [selectedGroup, allScores, existingScore]);

  const criteria = encounter.criteria || [];

  const setScore = (c, field, val) => {
    setCriteriaScores(prev => ({
      ...prev,
      [c]: { ...prev[c], [field]: Number(val) }
    }));
  };

  const getTotal = () => {
    return criteria.reduce((acc, c) => acc + (criteriaScores[c]?.score || 0), 0);
  };

  const save = async () => {
    if (!selectedGroup) { toast.error('Selecione um grupo'); return; }
    setSaving(true);

    const criteria_scores = criteria.map(c => ({
      criteria: c,
      score: criteriaScores[c]?.score || 0,
      max_score: criteriaScores[c]?.max_score || 10,
    }));

    const group = groups.find(g => g.id === selectedGroup);
    const total_score = getTotal();

    const data = {
      group_id: selectedGroup,
      group_name: group?.name || '',
      module_id: module.id,
      module_name: module.name,
      encounter_number: encounter.number,
      encounter_name: encounter.name,
      criteria_scores,
      total_score,
      notes,
    };

    // Check if already exists
    const existingInDB = allScores.find(s => s.group_id === selectedGroup);

    if (existingScore) {
      await base44.entities.Score.update(existingScore.id, data);
      toast.success('Pontuação atualizada!');
    } else if (existingInDB) {
      await base44.entities.Score.update(existingInDB.id, data);
      toast.success('Pontuação atualizada!');
    } else {
      await base44.entities.Score.create(data);
      toast.success('Pontuação registrada!');
    }

    setSaving(false);
    onSaved();
  };

  const getGroupColor = (groupId) => {
    const idx = groups.findIndex(g => g.id === groupId);
    return GROUP_COLORS[idx % GROUP_COLORS.length] || '#888';
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span>Pontuar — {module.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              Encontro {encounter.number}: {encounter.name}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!existingScore && (
            <div>
              <Label>Grupo</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(g.id) }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {existingScore && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(existingScore.group_id) }} />
              <span className="font-medium text-sm">{groups.find(g => g.id === existingScore.group_id)?.name}</span>
            </div>
          )}

          {criteria.length > 0 && (
            <div className="space-y-3">
              <Label>Critérios de Avaliação</Label>
              {criteria.map(c => (
                <div key={c} className="border border-border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">{c}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Pontuação</Label>
                      <Input
                        type="number"
                        min={0}
                        max={criteriaScores[c]?.max_score || 10}
                        value={criteriaScores[c]?.score || ''}
                        onChange={e => setScore(c, 'score', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Máximo</Label>
                      <Input
                        type="number"
                        min={1}
                        value={criteriaScores[c]?.max_score || 10}
                        onChange={e => setScore(c, 'max_score', e.target.value)}
                        placeholder="10"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">Total</span>
                <span className="text-xl font-bold" style={{ color: 'hsl(213,87%,28%)' }}>{getTotal()} pts</span>
              </div>
            </div>
          )}

          {criteria.length === 0 && (
            <div className="space-y-2">
              <Label>Pontuação</Label>
              <Input
                type="number"
                min={0}
                value={criteriaScores['__total']?.score || ''}
                onChange={e => setScore('__total', 'score', e.target.value)}
                placeholder="Informe a pontuação"
              />
            </div>
          )}

          <div>
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anotações sobre a avaliação..." />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={saving} style={{ background: 'hsl(213,87%,28%)' }}>
              {saving ? 'Salvando...' : 'Salvar Pontuação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
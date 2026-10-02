import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Medal, Star, TrendingUp, Users, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const GROUP_COLORS = ['#1a5fa8', '#2b8ac4', '#3dadd8', '#1d7a8c', '#0d4f7c'];

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [scores, setScores] = useState([]);
  const [modules, setModules] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Group.list(),
      base44.entities.Score.list(),
      base44.entities.Module.list(),
      base44.entities.Participant.list(),
    ]).then(([g, s, m, p]) => {
      setGroups(g);
      setScores(s);
      setModules(m);
      setParticipants(p);
      setLoading(false);
    });
  }, []);

  // Build ranking: group -> total score
  const groupRanking = groups.map((g, i) => {
    const groupScores = scores.filter(s => s.group_id === g.id);
    const total = groupScores.reduce((acc, s) => acc + (s.total_score || 0), 0);
    const byModule = {};
    modules.forEach(m => {
      const ms = groupScores.filter(s => s.module_id === m.id);
      byModule[m.name] = ms.reduce((a, s) => a + (s.total_score || 0), 0);
    });
    const byEncounter = {};
    [1, 2, 3].forEach(en => {
      const es = groupScores.filter(s => s.encounter_number === en);
      byEncounter[`Encontro ${en}`] = es.reduce((a, s) => a + (s.total_score || 0), 0);
    });
    const memberCount = participants.filter(p => p.group_id === g.id).length;
    return { ...g, total, byModule, byEncounter, memberCount, color: GROUP_COLORS[i % GROUP_COLORS.length] };
  }).sort((a, b) => b.total - a.total);

  // Chart data per encounter
  const encounterChartData = [1, 2, 3].map(en => {
    const row = { name: `Encontro ${en}` };
    groupRanking.forEach(g => {
      row[g.name] = g.byEncounter[`Encontro ${en}`] || 0;
    });
    return row;
  });

  // Chart data per module
  const moduleChartData = modules.map(m => {
    const row = { name: m.name };
    groupRanking.forEach(g => {
      row[g.name] = g.byModule[m.name] || 0;
    });
    return row;
  });

  const medalIcons = [
    <Trophy className="w-6 h-6" style={{ color: '#FFD700' }} />,
    <Medal className="w-6 h-6" style={{ color: '#C0C0C0' }} />,
    <Medal className="w-6 h-6" style={{ color: '#CD7F32' }} />,
    <Star className="w-5 h-5 text-muted-foreground" />,
    <Star className="w-5 h-5 text-muted-foreground" />,
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(213,87%,28%) 0%, hsl(200,60%,45%) 100%)' }}>
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Dashboard de Classificação</h1>
          <p className="text-blue-100 text-sm">Acompanhe a pontuação dos grupos por módulo e encontro</p>
        </div>
        <div className="absolute right-6 top-4 opacity-10">
          <TrendingUp className="w-32 h-32" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(213,87%,28%,0.1)' }}>
              <Users className="w-5 h-5" style={{ color: 'hsl(213,87%,28%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Grupos</p>
              <p className="text-2xl font-bold">{groups.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(200,60%,50%,0.1)' }}>
              <Users className="w-5 h-5" style={{ color: 'hsl(200,60%,50%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Participantes</p>
              <p className="text-2xl font-bold">{participants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(213,87%,28%,0.1)' }}>
              <BookOpen className="w-5 h-5" style={{ color: 'hsl(213,87%,28%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Módulos</p>
              <p className="text-2xl font-bold">{modules.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'hsl(200,60%,50%,0.1)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'hsl(200,60%,50%)' }} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pontuações</p>
              <p className="text-2xl font-bold">{scores.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border" style={{ background: 'linear-gradient(90deg, hsl(213,87%,28%) 0%, hsl(200,60%,45%) 100%)' }}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-300" /> Classificação Geral
          </h2>
        </div>
        <div className="divide-y divide-border">
          {groupRanking.map((g, i) => (
            <div key={g.id} className={`flex items-center gap-4 px-6 py-4 ${i === 0 ? 'bg-yellow-50' : ''}`}>
              <div className="w-8 flex justify-center">{medalIcons[i]}</div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: g.color }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{g.name}</p>
                <p className="text-xs text-muted-foreground">{g.memberCount} participantes</p>
              </div>
              {/* Pontuação por encontro */}
              <div className="hidden md:flex gap-3">
                {[1, 2, 3].map(en => (
                  <div key={en} className="text-center">
                    <p className="text-xs text-muted-foreground">Enc. {en}</p>
                    <p className="text-sm font-semibold" style={{ color: 'hsl(213,87%,28%)' }}>
                      {g.byEncounter[`Encontro ${en}`] || 0}
                    </p>
                  </div>
                ))}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold" style={{ color: 'hsl(213,87%,28%)' }}>{g.total}</p>
                <p className="text-xs text-muted-foreground">pts total</p>
              </div>
            </div>
          ))}
          {groupRanking.length === 0 && (
            <div className="px-6 py-10 text-center text-muted-foreground">
              Nenhuma pontuação registrada ainda.
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* By Encounter */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-bold text-foreground mb-4">Pontuação por Encontro</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={encounterChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,93%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {groupRanking.map((g) => (
                <Bar key={g.id} dataKey={g.name} fill={g.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Module */}
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
          <h2 className="font-bold text-foreground mb-4">Pontuação por Módulo</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={moduleChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210,20%,93%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {groupRanking.map((g) => (
                <Bar key={g.id} dataKey={g.name} fill={g.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Encounter detail per group */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Detalhes por Encontro e Módulo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-3 font-semibold">Grupo</th>
                {modules.map(m =>
                  (m.encounters || []).map(enc => (
                    <th key={`${m.id}-${enc.number}`} className="text-center px-3 py-3 font-semibold whitespace-nowrap">
                      {m.name}<br /><span className="text-xs font-normal text-muted-foreground">Enc. {enc.number}</span>
                    </th>
                  ))
                )}
                <th className="text-center px-4 py-3 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {groupRanking.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="font-medium">{g.name}</span>
                    </div>
                  </td>
                  {modules.map(m =>
                    (m.encounters || []).map(enc => {
                      const s = scores.find(sc => sc.group_id === g.id && sc.module_id === m.id && sc.encounter_number === enc.number);
                      return (
                        <td key={`${m.id}-${enc.number}`} className="text-center px-3 py-3">
                          <span className={`font-semibold ${s ? '' : 'text-muted-foreground'}`}
                            style={s ? { color: 'hsl(213,87%,28%)' } : {}}>
                            {s ? s.total_score : '—'}
                          </span>
                        </td>
                      );
                    })
                  )}
                  <td className="text-center px-4 py-3">
                    <span className="font-bold text-base" style={{ color: 'hsl(213,87%,28%)' }}>{g.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
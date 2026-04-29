'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, DoorOpen, UserCheck, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Pessoa, Acesso } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalPessoas: 0,
    entradasHoje: 0,
    saidasHoje: 0,
    noLocal: 0,
  });
  const [chartData, setChartData] = useState<{ dia: string; total: number }[]>([]);
  const [recentAccess, setRecentAccess] = useState<(Acesso & { pessoa: Pessoa | null })[]>([]);
  const [frequentes, setFrequentes] = useState<{ nome: string; cpf: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let acessos: (Acesso & { pessoa?: Pessoa | null })[] = [];
      let pessoas: Pessoa[] = [];

      const { data: acessosData } = await supabase
        .from('acessos')
        .select('*, pessoa: pessoas(*)')
        .order('data_entrada', { ascending: false })
        .limit(100);
      acessos = acessosData || [];

      const { data: pessoasData } = await supabase
        .from('pessoas')
        .select('*')
        .order('created_at', { ascending: false });
      pessoas = pessoasData || [];

      const dbAcessos = await dbService.getAcessos();
      const dbPessoas = await dbService.getPessoas();

      if (dbPessoas.length > pessoas.length) pessoas = dbPessoas;
      if (dbAcessos.length > acessos.length) acessos = dbAcessos;

      const hoje = startOfDay(new Date());
      const hojeStr = format(hoje, 'yyyy-MM-dd');

      const entradasHoje = acessos.filter(a =>
        a.data_entrada && format(new Date(a.data_entrada), 'yyyy-MM-dd') === hojeStr
      );
      const saidasHoje = acessos.filter(a =>
        a.data_saida && format(new Date(a.data_saida), 'yyyy-MM-dd') === hojeStr
      );
      const noLocal = acessos.filter(a => !a.data_saida).length;

      setStats({
        totalPessoas: pessoas.length,
        entradasHoje: entradasHoje.length,
        saidasHoje: saidasHoje.length,
        noLocal,
      });

      const ultimos7dias = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(hoje, 6 - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const total = acessos.filter(a =>
          a.data_entrada && format(new Date(a.data_entrada), 'yyyy-MM-dd') === dateStr
        ).length;
        return {
          dia: format(date, 'EEE', { locale: ptBR }),
          total,
        };
      });
      setChartData(ultimos7dias);

      setRecentAccess(acessos.slice(0, 10) as (Acesso & { pessoa: Pessoa | null })[]);

      const visitaCount: Record<string, { nome: string; cpf: string; total: number }> = {};
      acessos.forEach(a => {
        if (a.pessoa_id && a.pessoa) {
          if (!visitaCount[a.pessoa_id]) {
            visitaCount[a.pessoa_id] = { nome: a.pessoa.nome, cpf: a.pessoa.cpf, total: 0 };
          }
          visitaCount[a.pessoa_id].total++;
        }
      });
      const freq = Object.values(visitaCount)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setFrequentes(freq);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<DoorOpen className="text-primary-600" size={24} />}
          label="Entradas hoje"
          value={stats.entradasHoje}
          color="bg-primary-50"
        />
        <StatCard
          icon={<ArrowDownLeft className="text-green-600" size={24} />}
          label="Saídas hoje"
          value={stats.saidasHoje}
          color="bg-green-50"
        />
        <StatCard
          icon={<UserCheck className="text-orange-600" size={24} />}
          label="No local"
          value={stats.noLocal}
          color="bg-orange-50"
        />
        <StatCard
          icon={<Users className="text-purple-600" size={24} />}
          label="Cadastrados"
          value={stats.totalPessoas}
          color="bg-purple-50"
        />
      </div>

      <div className="card p-4 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-gray-500" />
          Entradas - Últimos 7 dias
        </h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {frequentes.length > 0 && (
        <div className="card p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-gray-500" />
            Visitantes frequentes
          </h2>
          <div className="space-y-2">
            {frequentes.map((f, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{f.nome}</p>
                  <p className="text-xs text-gray-500">{f.cpf}</p>
                </div>
                <span className="badge bg-primary-100 text-primary-700">{f.total} visitas</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Acessos recentes</h2>
          <Link href="/acessos" className="text-sm text-primary-600 font-medium">
            Ver todos
          </Link>
        </div>
        <div className="space-y-3">
          {recentAccess.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum acesso registrado</p>
          ) : (
            recentAccess.slice(0, 5).map((acesso) => (
              <div key={acesso.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-600">
                    {acesso.pessoa?.nome?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {acesso.pessoa?.nome || 'Desconhecido'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {acesso.data_entrada
                      ? format(new Date(acesso.data_entrada), 'HH:mm')
                      : '--:--'}
                    {acesso.data_saida && ` - ${format(new Date(acesso.data_saida), 'HH:mm')}`}
                  </p>
                </div>
                <span className={`badge ${!acesso.data_saida ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {!acesso.data_saida ? 'No local' : 'Saiu'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className={`card p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  );
}

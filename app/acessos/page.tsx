'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { saveAcesso } from '@/lib/sync';
import { Pessoa, Acesso } from '@/lib/types';
import { Search, DoorOpen, DoorClosed, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export default function AcessosPage() {
  const [acessos, setAcessos] = useState<(Acesso & { pessoa: Pessoa | null })[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedPessoaId, setSelectedPessoaId] = useState('');
  const [setor, setSetor] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let acessosList: (Acesso & { pessoa?: Pessoa | null })[] = [];
      let pessoasList: Pessoa[] = [];

      const { data } = await supabase
        .from('acessos')
        .select('*, pessoa: pessoas(*)')
        .order('data_entrada', { ascending: false})
        .limit(200);
      acessosList = data || [];

      const { data: pessoasData } = await supabase
        .from('pessoas')
        .select('*')
        .order('nome');
      pessoasList = pessoasData || [];

      const dbAcessos = await dbService.getAcessos();
      const dbPessoas = await dbService.getPessoas();

      if (dbAcessos.length > acessosList.length) {
        const merged = dbAcessos.map(a => {
          const fromSupabase = acessosList.find(sa => sa.id === a.id);
          return { ...a, pessoa: fromSupabase?.pessoa || dbPessoas.find(p => p.id === a.pessoa_id) || null };
        });
        acessosList = merged;
      }
      if (dbPessoas.length > pessoasList.length) pessoasList = dbPessoas;

      setAcessos(acessosList as (Acesso & { pessoa: Pessoa | null })[]);
      setPessoas(pessoasList);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    }
    setLoading(false);
  }

  const filtered = search
    ? acessos.filter(a =>
        a.pessoa?.nome.toLowerCase().includes(search.toLowerCase()) ||
        a.pessoa?.cpf.includes(search) ||
        a.setor?.toLowerCase().includes(search.toLowerCase())
      )
    : acessos;

  const handleEntrada = async () => {
    if (!selectedPessoaId) return;
    setProcessing(selectedPessoaId);
    try {
      await saveAcesso({
        pessoa_id: selectedPessoaId,
        data_entrada: new Date().toISOString(),
        setor,
        autorizado_por: autorizadoPor,
      });
      setSelectedPessoaId('');
      setSetor('');
      setAutorizadoPor('');
      setShowEntryForm(false);
      await loadData();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
    }
    setProcessing(null);
  };

  const handleSaida = async (acessoId: string) => {
    setProcessing(acessoId);
    try {
      await dbService.updateAcesso(acessoId, {
        data_saida: new Date().toISOString(),
      });

      await supabase
        .from('acessos')
        .update({ data_saida: new Date().toISOString() })
        .eq('id', acessoId);
      await loadData();
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
    }
    setProcessing(null);
  };

  const pessoasNoLocal = pessoas.filter(p =>
    acessos.some(a => a.pessoa_id === p.id && !a.data_saida)
  );

  return (
    <AppLayout title="Acessos">
      <div className="space-y-4">
        <button
          onClick={() => setShowEntryForm(!showEntryForm)}
          className="btn-success w-full py-4 text-base"
        >
          <DoorOpen size={20} />
          Nova Entrada
        </button>

        {showEntryForm && (
          <div className="card p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">Registrar entrada</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Visitante *</label>
              <select
                value={selectedPessoaId}
                onChange={(e) => setSelectedPessoaId(e.target.value)}
                className="input"
                required
              >
                <option value="">Selecione um visitante</option>
                {pessoas.map(p => (
                  <option key={p.id} value={p.id!}>
                    {p.nome} - {p.cpf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Setor</label>
              <input
                type="text"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                className="input"
                placeholder="Setor de destino"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Autorizado por</label>
              <input
                type="text"
                value={autorizadoPor}
                onChange={(e) => setAutorizadoPor(e.target.value)}
                className="input"
                placeholder="Nome de quem autorizou"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEntryForm(false)}
                className="btn-secondary flex-1 py-3"
              >
                Cancelar
              </button>
              <button
                onClick={handleEntrada}
                disabled={!selectedPessoaId || processing === selectedPessoaId}
                className="btn-primary flex-1 py-3"
              >
                {processing === selectedPessoaId ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        )}

        {pessoasNoLocal.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Pessoas no local ({pessoasNoLocal.length})
            </h3>
            <div className="space-y-2">
              {pessoasNoLocal.map(pessoa => {
                const acesso = acessos.find(a => a.pessoa_id === pessoa.id && !a.data_saida);
                return (
                  <div key={pessoa.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-700">
                          {pessoa.nome.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{pessoa.nome}</p>
                        <p className="text-xs text-gray-500">
                          Entrada: {acesso?.data_entrada
                            ? format(new Date(acesso.data_entrada), 'HH:mm')
                            : '--:--'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => acesso?.id && handleSaida(acesso.id)}
                      disabled={processing === acesso?.id}
                      className="btn-danger px-3 py-2 text-sm"
                    >
                      <DoorClosed size={16} />
                      <span className="hidden sm:inline ml-1">Saída</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nos acessos"
            className="input pl-10"
          />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Histórico</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum acesso registrado</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((acesso) => (
                <div key={acesso.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      acesso.data_saida ? 'bg-gray-100' : 'bg-green-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        acesso.data_saida ? 'text-gray-500' : 'text-green-700'
                      }`}>
                        {acesso.pessoa?.nome?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <Link
                        href={`/visitantes/${acesso.pessoa_id}`}
                        className="font-medium text-gray-900 hover:text-primary-600"
                      >
                        {acesso.pessoa?.nome || 'Desconhecido'}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {acesso.data_entrada
                          ? format(new Date(acesso.data_entrada), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : '--'}
                        {acesso.setor && ` • ${acesso.setor}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!acesso.data_saida && acesso.id ? (
                      <button
                        onClick={() => handleSaida(acesso.id!)}
                        disabled={processing === acesso.id}
                        className="btn-danger px-2 py-1.5 text-xs"
                      >
                        <DoorClosed size={14} />
                        <span className="hidden sm:inline ml-1">Saída</span>
                      </button>
                    ) : (
                      <span className="badge bg-gray-100 text-gray-600">
                        {acesso.data_saida
                          ? format(new Date(acesso.data_saida), 'HH:mm', { locale: ptBR })
                          : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

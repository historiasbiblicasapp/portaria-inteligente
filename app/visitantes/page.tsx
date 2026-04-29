'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/app-layout';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { Pessoa } from '@/lib/types';
import Link from 'next/link';
import { Search, Plus, User, QrCode } from 'lucide-react';

export default function VisitantesPage() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let list: Pessoa[] = [];

      if (session) {
        const { data } = await supabase
          .from('pessoas')
          .select('*')
          .order('created_at', { ascending: false });
        list = data || [];
      }

      const dbList = await dbService.getPessoas();
      if (dbList.length > list.length) list = dbList;

      setPessoas(list);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    }
    setLoading(false);
  }

  const filtered = search
    ? pessoas.filter(p =>
        p.nome.toLowerCase().includes(search.toLowerCase()) ||
        p.cpf.includes(search) ||
        p.placa?.toLowerCase().includes(search.toLowerCase())
      )
    : pessoas;

  return (
    <AppLayout title="Visitantes">
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF ou placa"
            className="input pl-10"
          />
        </div>
        <Link href="/visitantes/novo" className="btn-primary px-4">
          <Plus size={20} />
          <span className="hidden sm:inline">Novo</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhum visitante encontrado</p>
          <Link href="/visitantes/novo" className="btn-primary">
            <Plus size={18} />
            Cadastrar primeiro visitante
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((pessoa) => (
            <Link
              key={pessoa.id}
              href={`/visitantes/${pessoa.id}`}
              className="card p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              {pessoa.foto_url ? (
                <img
                  src={pessoa.foto_url}
                  alt={pessoa.nome}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-lg font-semibold text-gray-500">
                    {pessoa.nome.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{pessoa.nome}</p>
                <p className="text-xs text-gray-500">{pessoa.cpf}</p>
                {pessoa.empresa && (
                  <p className="text-xs text-gray-400 truncate">{pessoa.empresa}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge badge-${pessoa.tipo}`}>
                  {pessoa.tipo}
                </span>
                {pessoa.placa && (
                  <span className="badge bg-gray-100 text-gray-600">{pessoa.placa}</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

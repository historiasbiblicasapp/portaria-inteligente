'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { saveAcesso } from '@/lib/sync';
import { Pessoa, Acesso } from '@/lib/types';
import { QRCodeComponent as QRCode } from '@/components/qr-code';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, QrCode, DoorOpen, DoorClosed, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

export default function PessoaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      let p: Pessoa | undefined;
      let a: Acesso[] = [];

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: pessoaData } = await supabase
          .from('pessoas')
          .select('*')
          .eq('id', params.id)
          .single();
        p = pessoaData || undefined;

        const { data: acessosData } = await supabase
          .from('acessos')
          .select('*')
          .eq('pessoa_id', params.id)
          .order('data_entrada', { ascending: false });
        a = acessosData || [];
      }

      const dbPessoa = await dbService.getPessoaById(params.id as string);
      if (dbPessoa && !p) p = dbPessoa;

      const dbAcessos = await dbService.getAcessosByPessoaId(params.id as string);
      if (dbAcessos.length > a.length) a = dbAcessos;

      setPessoa(p || null);
      setAcessos(a);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    }
    setLoading(false);
  }

  const handleEntrada = async () => {
    setProcessing(true);
    try {
      await saveAcesso({
        pessoa_id: pessoa!.id!,
        data_entrada: new Date().toISOString(),
      });
      await loadData();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
    }
    setProcessing(false);
  };

  const handleSaida = async () => {
    setProcessing(true);
    try {
      const acessoAberto = acessos.find(a => !a.data_saida);
      if (acessoAberto?.id) {
        await dbService.updateAcesso(acessoAberto.id, {
          data_saida: new Date().toISOString(),
        });

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await supabase
            .from('acessos')
            .update({ data_saida: new Date().toISOString() })
            .eq('id', acessoAberto.id);
        }
      }
      await loadData();
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
    }
    setProcessing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este visitante?')) return;
    try {
      await dbService.deletePessoa(pessoa!.id!);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('pessoas').delete().eq('id', pessoa!.id!);
      }
      router.push('/visitantes');
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const noLocal = acessos.some(a => !a.data_saida);

  if (loading) {
    return (
      <AppLayout title="Visitante">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  if (!pessoa) {
    return (
      <AppLayout title="Visitante">
        <div className="card p-8 text-center">
          <p className="text-gray-500">Visitante não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={pessoa.nome}>
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="card p-5">
          <div className="flex items-start gap-4">
            {pessoa.foto_url ? (
              <img
                src={pessoa.foto_url}
                alt={pessoa.nome}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                <span className="text-3xl font-semibold text-gray-400">
                  {pessoa.nome.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{pessoa.nome}</h2>
              <span className={`badge badge-${pessoa.tipo} mt-1`}>{pessoa.tipo}</span>
              {pessoa.empresa && (
                <p className="text-sm text-gray-500 mt-1">{pessoa.empresa}</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">CPF</p>
              <p className="font-medium">{pessoa.cpf}</p>
            </div>
            {pessoa.rg && (
              <div>
                <p className="text-gray-500">RG</p>
                <p className="font-medium">{pessoa.rg}</p>
              </div>
            )}
            {pessoa.placa && (
              <div>
                <p className="text-gray-500">Placa</p>
                <p className="font-medium">{pessoa.placa}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Cadastro</p>
              <p className="font-medium">
                {pessoa.created_at
                  ? format(new Date(pessoa.created_at), 'dd/MM/yyyy', { locale: ptBR })
                  : '--'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!noLocal ? (
            <button
              onClick={handleEntrada}
              disabled={processing}
              className="btn-success flex-1 py-3.5"
            >
              <DoorOpen size={20} />
              Registrar entrada
            </button>
          ) : (
            <button
              onClick={handleSaida}
              disabled={processing}
              className="btn-danger flex-1 py-3.5"
            >
              <DoorClosed size={20} />
              Registrar saída
            </button>
          )}
          <button
            onClick={() => setShowQR(!showQR)}
            className="btn-secondary px-4 py-3.5"
          >
            <QrCode size={20} />
          </button>
        </div>

        <div className="flex gap-3">
          <Link href={`/visitantes/${pessoa.id}/editar`} className="btn-secondary flex-1 py-3.5">
            <Edit size={18} />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="btn-danger px-4 py-3.5"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {showQR && pessoa.qr_code && (
          <div className="card p-5 text-center">
            <h3 className="font-semibold text-gray-900 mb-3">QR Code</h3>
            <div className="bg-white p-4 rounded-xl inline-block">
              <QRCode value={pessoa.qr_code} size={200} />
            </div>
            <p className="text-xs text-gray-500 mt-3 break-all">{pessoa.qr_code}</p>
          </div>
        )}

        {acessos.length > 0 && (
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Histórico de acessos</h3>
            <div className="space-y-2">
              {acessos.map((acesso) => (
                <div key={acesso.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {acesso.data_entrada
                        ? format(new Date(acesso.data_entrada), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '--'}
                    </p>
                    {acesso.setor && (
                      <p className="text-xs text-gray-500">{acesso.setor}</p>
                    )}
                  </div>
                  <span className={`badge ${!acesso.data_saida ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {!acesso.data_saida ? 'No local' : (
                      acesso.data_saida
                        ? `Saída ${format(new Date(acesso.data_saida), 'HH:mm')}`
                        : ''
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link href="/visitantes" className="btn-secondary w-full py-3.5 block text-center">
          <ArrowLeft size={18} className="inline mr-1" />
          Voltar para lista
        </Link>
      </div>
    </AppLayout>
  );
}

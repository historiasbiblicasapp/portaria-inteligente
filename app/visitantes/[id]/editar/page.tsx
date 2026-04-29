'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/app-layout';
import { savePessoa } from '@/lib/sync';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/storage';
import { Pessoa, TipoPessoa } from '@/lib/types';
import { formatCPF, formatPlaca } from '@/lib/utils';
import { Camera, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function EditarPessoaPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [tipo, setTipo] = useState<TipoPessoa>('visitante');
  const [placa, setPlaca] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [documentoUrl, setDocumentoUrl] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [documento, setDocumento] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      let pessoa: Pessoa | undefined;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('pessoas')
          .select('*')
          .eq('id', params.id)
          .single();
        pessoa = data;
      }

      const dbPessoa = await dbService.getPessoaById(params.id as string);
      if (dbPessoa && !pessoa) pessoa = dbPessoa;

      if (pessoa) {
        setNome(pessoa.nome);
        setCpf(pessoa.cpf);
        setRg(pessoa.rg || '');
        setEmpresa(pessoa.empresa || '');
        setTipo(pessoa.tipo);
        setPlaca(pessoa.placa || '');
        setFotoUrl(pessoa.foto_url || '');
        setDocumentoUrl(pessoa.documento_url || '');
        if (pessoa.foto_url) setFotoPreview(pessoa.foto_url);
      } else {
        router.push('/visitantes');
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
      router.push('/visitantes');
    }
    setLoading(false);
  }

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      let newFotoUrl = fotoUrl;
      let newDocUrl = documentoUrl;

      if (foto) {
        const url = await uploadFile('fotos', foto);
        if (url) newFotoUrl = url;
      }

      if (documento) {
        const url = await uploadFile('documentos', documento);
        if (url) newDocUrl = url;
      }

      await savePessoa({
        id: params.id as string,
        nome,
        cpf: cpf.replace(/\D/g, ''),
        rg,
        empresa,
        tipo,
        placa: placa.toUpperCase(),
        foto_url: newFotoUrl,
        documento_url: newDocUrl,
      });

      router.push(`/visitantes/${params.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Editar Visitante">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Editar Visitante">
      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Dados pessoais</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input"
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF *</label>
              <input
                type="text"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                className="input"
                placeholder="000.000.000-00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">RG</label>
              <input
                type="text"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
                className="input"
                placeholder="0000000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo *</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPessoa)}
              className="input"
              required
            >
              <option value="visitante">Visitante</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="motorista">Motorista</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
            <input
              type="text"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="input"
              placeholder="Nome da empresa"
            />
          </div>
        </div>

        {(tipo === 'motorista' || tipo === 'fornecedor') && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Veículo</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Placa</label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(formatPlaca(e.target.value))}
                className="input"
                placeholder="ABC1D23"
              />
            </div>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Documentos</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Foto</label>
            <div className="flex items-center gap-4">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                  <Camera size={24} className="text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-4 py-2.5 text-sm"
              >
                <Upload size={16} />
                {fotoPreview ? 'Trocar foto' : 'Enviar foto'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento</label>
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="btn-secondary px-4 py-2.5 text-sm w-full"
            >
              <Upload size={16} />
              {documento ? documento.name : (documentoUrl ? 'Documento atual' : 'Enviar documento')}
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setDocumento(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 text-center">{error}</div>
        )}

        <div className="flex gap-3">
          <Link href={`/visitantes/${params.id}`} className="btn-secondary flex-1 py-3.5">
            <ArrowLeft size={18} />
            Voltar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 py-3.5"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar alterações'
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}

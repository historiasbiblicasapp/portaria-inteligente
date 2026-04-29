'use client';

import { useState, useRef } from 'react';
import { savePreCadastro } from '@/lib/sync';
import { uploadFile } from '@/lib/storage';
import { formatCPF, formatPlaca, generateQRCodeId } from '@/lib/utils';
import { Shield, Upload, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { QRCodeComponent as QRCode } from '@/components/qr-code';
import Link from 'next/link';

export default function PreCadastroPage() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [placa, setPlaca] = useState('');
  const [documento, setDocumento] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let documento_url = '';
      if (documento) {
        const url = await uploadFile('documentos', documento, 'pre-cadastro/');
        if (url) documento_url = url;
      }

      const qr_code = generateQRCodeId();

      await savePreCadastro({
        nome,
        cpf: cpf.replace(/\D/g, ''),
        empresa,
        placa: placa.toUpperCase() || undefined,
        documento_url,
        qr_code,
        tipo: 'visitante',
        pre_cadastro: true,
      });

      setQrCode(qr_code);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao realizar pré-cadastro';
      setError(message);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-600 to-green-800 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pré-cadastro realizado!</h1>
            <p className="text-gray-600 mb-6">
              Apresente este QR Code na portaria para agilizar sua entrada.
            </p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-inner mb-4">
              <QRCode value={qrCode} size={200} />
            </div>
            <p className="text-xs text-gray-400 break-all mb-6">{qrCode}</p>

            <p className="text-sm text-gray-500 mb-6">
              Salve esta tela ou tire um screenshot para apresentar na portaria.
            </p>

            <Link
              href="/login"
              className="btn-primary w-full py-3.5 text-base"
            >
              Acessar sistema da portaria
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Pré-cadastro</h1>
          <p className="text-primary-100 mt-1">Preencha seus dados para agilizar o acesso</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome completo *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input"
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                CPF *
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Empresa
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="input"
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Placa do veículo (opcional)
              </label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(formatPlaca(e.target.value))}
                className="input"
                placeholder="ABC1D23"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Documento (opcional)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-4 py-2.5 text-sm w-full"
              >
                <Upload size={16} />
                {documento ? documento.name : 'Enviar foto do documento'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setDocumento(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                'Realizar pré-cadastro'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <Link href="/login" className="text-sm text-primary-600 font-medium hover:underline">
              Sou funcionário da portaria
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

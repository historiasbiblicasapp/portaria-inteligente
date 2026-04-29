'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/app-layout';
import { Html5Qrcode } from 'html5-qrcode';
import { dbService } from '@/lib/indexeddb';
import { supabase } from '@/lib/supabase';
import { saveAcesso } from '@/lib/sync';
import { Pessoa, Acesso } from '@/lib/types';
import { Camera, CameraOff, DoorOpen, DoorClosed, Loader2, X } from 'lucide-react';
import { QRCodeComponent as QRCode } from '@/components/qr-code';

export default function ScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<Pessoa | null>(null);
  const [acessoAberto, setAcessoAberto] = useState<Acesso | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError('');
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleQRCode(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao acessar câmera';
      setError(message);
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleQRCode = async (code: string) => {
    setLoading(true);
    setError('');
    setLastScanned(null);
    setAcessoAberto(null);

    try {
      let pessoa: Pessoa | undefined;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from('pessoas')
          .select('*')
          .eq('qr_code', code)
          .single();
        pessoa = data;
      }

      if (!pessoa) {
        pessoa = await dbService.getPessoaByQRCode(code);
      }

      if (!pessoa) {
        setError('Visitante não encontrado');
        setLoading(false);
        return;
      }

      setLastScanned(pessoa);

      const dbAcessos = await dbService.getAcessosByPessoaId(pessoa.id!);
      const acesso = dbAcessos.find(a => !a.data_saida);
      if (acesso) {
        setAcessoAberto(acesso);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar visitante';
      setError(message);
    }
    setLoading(false);
  };

  const handleManualSearch = async () => {
    if (!manualCode.trim()) return;
    await handleQRCode(manualCode.trim());
  };

  const handleEntrada = async () => {
    if (!lastScanned) return;
    setLoading(true);
    try {
      await saveAcesso({
        pessoa_id: lastScanned.id!,
        data_entrada: new Date().toISOString(),
      });
      setAcessoAberto({ pessoa_id: lastScanned.id!, data_entrada: new Date().toISOString() } as Acesso);
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
    }
    setLoading(false);
  };

  const handleSaida = async () => {
    if (!acessoAberto?.id) return;
    setLoading(true);
    try {
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
      setAcessoAberto(null);
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
    }
    setLoading(false);
  };

  return (
    <AppLayout title="Scanner QR Code">
      <div className="space-y-4 max-w-md mx-auto">
        <div className="card p-4">
          {!scanning ? (
            <button
              onClick={startScanner}
              className="btn-primary w-full py-4 text-base"
            >
              <Camera size={24} />
              Abrir câmera
            </button>
          ) : (
            <div>
              <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden" />
              <button
                onClick={stopScanner}
                className="btn-secondary w-full mt-3 py-3"
              >
                <CameraOff size={18} />
                Fechar câmera
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowManual(!showManual)}
          className="btn-secondary w-full py-3"
        >
          Digitar código manualmente
        </button>

        {showManual && (
          <div className="card p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Código QR do visitante"
                className="input flex-1"
              />
              <button
                onClick={handleManualSearch}
                className="btn-primary px-4"
              >
                Buscar
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="card p-6 text-center">
            <Loader2 size={32} className="mx-auto text-primary-600 animate-spin" />
            <p className="mt-2 text-gray-500">Buscando visitante...</p>
          </div>
        )}

        {error && (
          <div className="card p-4 text-center bg-red-50 border-red-200">
            <X size={24} className="mx-auto text-red-500 mb-2" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {lastScanned && !loading && (
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              {lastScanned.foto_url ? (
                <img
                  src={lastScanned.foto_url}
                  alt={lastScanned.nome}
                  className="w-16 h-16 rounded-xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl font-semibold text-gray-500">
                    {lastScanned.nome.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg text-gray-900">{lastScanned.nome}</h3>
                <span className={`badge badge-${lastScanned.tipo}`}>{lastScanned.tipo}</span>
                <p className="text-sm text-gray-500 mt-1">
                  {lastScanned.empresa || 'Sem empresa'}
                </p>
              </div>
            </div>

            {acessoAberto ? (
              <button
                onClick={handleSaida}
                disabled={loading}
                className="btn-danger w-full py-4 text-base"
              >
                <DoorClosed size={20} />
                Registrar saída
              </button>
            ) : (
              <button
                onClick={handleEntrada}
                disabled={loading}
                className="btn-success w-full py-4 text-base"
              >
                <DoorOpen size={20} />
                Registrar entrada
              </button>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
              <QRCode value={lastScanned.qr_code || ''} size={150} />
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

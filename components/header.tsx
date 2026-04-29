'use client';

import { useAuth } from '@/hooks/use-auth';
import { useOnline } from '@/hooks/use-online';
import { LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { syncData } from '@/lib/sync';

export function Header({ title = 'Portaria Inteligente' }: { title?: string }) {
  const { signOut } = useAuth();
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    await syncData();
    setSyncing(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">PI</span>
          </div>
          <h1 className="font-semibold text-gray-900 truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing || !online}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Sincronizar agora"
          >
            <RefreshCw size={20} className={`text-gray-600 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Sair"
          >
            <LogOut size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  );
}

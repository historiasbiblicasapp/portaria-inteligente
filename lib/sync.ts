import { supabase } from '@/lib/supabase';
import { dbService } from '@/lib/indexeddb';
import { Pessoa, Acesso, PreCadastroOffline } from '@/lib/types';

export async function syncData(): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;

  try {
    const acessosPendentes = await dbService.getAcessosNaoSincronizados();
    for (const acesso of acessosPendentes) {
      try {
        const { error } = await supabase
          .from('acessos')
          .upsert({
            id: acesso.id,
            pessoa_id: acesso.pessoa_id,
            data_entrada: acesso.data_entrada,
            data_saida: acesso.data_saida,
            autorizado_por: acesso.autorizado_por,
            setor: acesso.setor,
            synced: true,
          });

        if (!error) {
          if (acesso.id) await dbService.markSynced('acessos', acesso.id);
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    const preCadastrosPendentes = await dbService.getPreCadastrosNaoSincronizados();
    for (const pre of preCadastrosPendentes) {
      try {
        const { error } = await supabase
          .from('pessoas')
          .upsert({
            ...pre.dados,
            pre_cadastro: true,
            synced: true,
          });

        if (!error) {
          if (pre.id) await dbService.markSynced('pre_cadastros', pre.id);
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { synced, errors };
  } catch {
    return { synced, errors: errors + 1 };
  }
}

export async function syncFromSupabase(): Promise<void> {
  try {
    const { data: pessoas } = await supabase
      .from('pessoas')
      .select('*')
      .order('created_at', { ascending: false });

    if (pessoas) {
      for (const pessoa of pessoas) {
        await dbService.putPessoa(pessoa as Pessoa);
      }
    }

    const { data: acessos } = await supabase
      .from('acessos')
      .select('*, pessoa: pessoas(*)')
      .order('data_entrada', { ascending: false })
      .limit(500);

    if (acessos) {
      for (const acesso of acessos) {
        await dbService.putAcesso(acesso as Acesso);
      }
    }
  } catch (error) {
    console.error('Erro ao sincronizar do Supabase:', error);
  }
}

export async function savePessoa(pessoa: Omit<Pessoa, 'id'> & { id?: string }): Promise<string> {
  const id = pessoa.id || crypto.randomUUID();
  const pessoaCompleta = { ...pessoa, id };

  await dbService.putPessoa(pessoaCompleta);

  const online = navigator.onLine;
  if (online) {
    try {
      const { error } = await supabase
        .from('pessoas')
        .upsert(pessoaCompleta);

      if (error) throw error;
    } catch {
      // Salvo localmente, sync depois
    }
  }

  return id;
}

export async function saveAcesso(acesso: Omit<Acesso, 'id'> & { id?: string }): Promise<string> {
  const id = acesso.id || crypto.randomUUID();
  const acessoCompleto = {
    ...acesso,
    id,
    synced: navigator.onLine,
  };

  await dbService.putAcesso(acessoCompleto);

  const online = navigator.onLine;
  if (online) {
    try {
      const { error } = await supabase
        .from('acessos')
        .upsert(acessoCompleto);

      if (error) throw error;
    } catch {
      // Salvo localmente, sync depois
    }
  }

  return id;
}

export async function savePreCadastro(dados: Partial<Pessoa>): Promise<string> {
  const id = crypto.randomUUID();
  const preCadastro: PreCadastroOffline = {
    id,
    dados: {
      ...dados,
      id,
      pre_cadastro: true,
      qr_code: crypto.randomUUID(),
    },
    synced: false,
  };

  await dbService.putPreCadastro(preCadastro);
  await dbService.putPessoa(preCadastro.dados as Pessoa);

  const online = navigator.onLine;
  if (online) {
    try {
      const { error } = await supabase
        .from('pessoas')
        .insert(preCadastro.dados);

      if (!error) {
        await dbService.markSynced('pre_cadastros', id);
      }
    } catch {
      // Salvo localmente, sync depois
    }
  }

  return id;
}

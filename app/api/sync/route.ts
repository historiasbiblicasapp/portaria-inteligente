import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { acessos, preCadastros } = body;

    const results: { synced: number; errors: { type: string; id: string | undefined; error: string }[] } = { synced: 0, errors: [] };

    if (acessos && acessos.length > 0) {
      for (const acesso of acessos) {
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

          if (error) {
            results.errors.push({ type: 'acesso', id: acesso.id, error: error.message });
          } else {
            results.synced++;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          results.errors.push({ type: 'acesso', id: acesso.id, error: message });
        }
      }
    }

    if (preCadastros && preCadastros.length > 0) {
      for (const pre of preCadastros) {
        try {
          const { error } = await supabase
            .from('pessoas')
            .upsert({
              ...pre.dados,
              pre_cadastro: true,
              synced: true,
            });

          if (error) {
            results.errors.push({ type: 'precadastro', id: pre.id, error: error.message });
          } else {
            results.synced++;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          results.errors.push({ type: 'precadastro', id: pre.id, error: message });
        }
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const qr_code = searchParams.get('qr_code');

    if (!qr_code) {
      return NextResponse.json({ error: 'QR code não fornecido' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: pessoa, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('qr_code', qr_code)
      .single();

    if (error || !pessoa) {
      return NextResponse.json({ error: 'Visitante não encontrado' }, { status: 404 });
    }

    const { data: acessos } = await supabase
      .from('acessos')
      .select('*')
      .eq('pessoa_id', pessoa.id)
      .order('data_entrada', { ascending: false })
      .limit(1);

    const acessoAberto = acessos?.[0] && !acessos[0].data_saida ? acessos[0] : null;

    return NextResponse.json({
      pessoa,
      acessoAberto,
      noLocal: !!acessoAberto,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

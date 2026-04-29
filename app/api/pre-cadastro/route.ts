import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { nome, cpf, empresa, placa, documento_url } = body;

    if (!nome || !cpf) {
      return NextResponse.json(
        { error: 'Nome e CPF são obrigatórios' },
        { status: 400 }
      );
    }

    const qr_code = crypto.randomUUID();

    const { data, error } = await supabase
      .from('pessoas')
      .insert({
        nome,
        cpf: cpf.replace(/\D/g, ''),
        empresa,
        placa: placa?.toUpperCase(),
        documento_url,
        qr_code,
        tipo: 'visitante',
        pre_cadastro: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'CPF já cadastrado' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Erro ao realizar pré-cadastro' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      qr_code,
      pessoa: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

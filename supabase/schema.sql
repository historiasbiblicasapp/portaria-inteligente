-- ========================================
-- PORTARIA INTELIGENTE - SCHEMA COMPLETO
-- ========================================

-- Tabela: pessoas
CREATE TABLE IF NOT EXISTS pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE NOT NULL,
  rg VARCHAR(20),
  empresa VARCHAR(255),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('visitante', 'fornecedor', 'motorista')),
  placa VARCHAR(20),
  foto_url TEXT,
  documento_url TEXT,
  qr_code UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  pre_cadastro BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: acessos
CREATE TABLE IF NOT EXISTS acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES pessoas(id) ON DELETE CASCADE,
  data_entrada TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_saida TIMESTAMP WITH TIME ZONE,
  autorizado_por VARCHAR(255),
  setor VARCHAR(100),
  synced BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: pre_cadastros (fila de sync)
CREATE TABLE IF NOT EXISTS pre_cadastros_offline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dados JSONB NOT NULL,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_pessoas_cpf ON pessoas(cpf);
CREATE INDEX IF NOT EXISTS idx_pessoas_qr_code ON pessoas(qr_code);
CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome);
CREATE INDEX IF NOT EXISTS idx_pessoas_placa ON pessoas(placa);
CREATE INDEX IF NOT EXISTS idx_acessos_pessoa_id ON acessos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_acessos_data_entrada ON acessos(data_entrada);
CREATE INDEX IF NOT EXISTS idx_acessos_synced ON acessos(synced);

-- RLS (Row Level Security)
ALTER TABLE pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_cadastros_offline ENABLE ROW LEVEL SECURITY;

-- Politicas para pessoas
CREATE POLICY "Pessoas visiveis para todos autenticados"
  ON pessoas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insercao de pessoas para autenticados"
  ON pessoas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Atualizacao de pessoas para autenticados"
  ON pessoas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Pre-cadastro publico (insert)"
  ON pessoas FOR INSERT
  TO anon, authenticated
  WITH CHECK (pre_cadastro = true);

-- Politicas para acessos
CREATE POLICY "Acessos visiveis para autenticados"
  ON acessos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insercao de acessos para autenticados"
  ON acessos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Atualizacao de acessos para autenticados"
  ON acessos FOR UPDATE
  TO authenticated
  USING (true);

-- Funcao para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON pessoas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

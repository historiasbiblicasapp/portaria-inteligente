export type TipoPessoa = 'visitante' | 'fornecedor' | 'motorista';

export interface Pessoa {
  id?: string;
  nome: string;
  cpf: string;
  rg?: string;
  empresa?: string;
  tipo: TipoPessoa;
  placa?: string;
  foto_url?: string;
  documento_url?: string;
  qr_code?: string;
  pre_cadastro?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Acesso {
  id?: string;
  pessoa_id: string;
  data_entrada: string;
  data_saida?: string;
  autorizado_por?: string;
  setor?: string;
  synced?: boolean;
  created_at?: string;
  pessoa?: Pessoa | null;
}

export interface PreCadastroOffline {
  id?: string;
  dados: Partial<Pessoa>;
  synced?: boolean;
  created_at?: string;
}

export interface DashboardStats {
  total_entradas_hoje: number;
  total_saidas_hoje: number;
  visitantes_no_local: number;
  entradas_por_tipo: { tipo: string; total: number }[];
  entradas_ultimos_7_dias: { date: string; total: number }[];
  visitantes_frequentes: { nome: string; cpf: string; total_visitas: number }[];
  acessos_recentes: (Acesso & { pessoa: Pessoa | null })[];
}

# Portaria Inteligente

Sistema completo de controle de acesso e portaria com funcionamento offline-first, PWA instalável e QR Code.

## Tecnologias

- **Next.js 14** (App Router)
- **TypeScript**
- **Supabase** (Auth + Database + Storage)
- **TailwindCSS**
- **PWA** (instalável no celular)
- **IndexedDB** (funcionamento offline)
- **QR Code** (geração e leitura via câmera)

## Funcionalidades

- Autenticação com Supabase Auth
- CRUD completo de visitantes/fornecedores/motoristas
- Registro de entrada e saída
- Geração e leitura de QR Code
- Pré-cadastro público online
- Funcionamento offline com sincronização
- Dashboard com estatísticas e gráficos
- PWA instalável (Android/iOS)

## Configuração do Banco de Dados

Execute o script SQL no Supabase SQL Editor:

```bash
# Copie o conteúdo de supabase/schema.sql
# Execute no Supabase Dashboard > SQL Editor
```

### Storage Buckets

Crie os seguintes buckets no Supabase Storage:

1. **fotos** - Público (para fotos de visitantes)
2. **documentos** - Privado (para documentos)

```sql
-- Criar buckets via SQL
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos', 'fotos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);
```

### Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

## Instalação

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## Deploy na Vercel

1. **Crie uma conta na Vercel** em [vercel.com](https://vercel.com)

2. **Conecte seu repositório** GitHub/GitLab/Bitbucket

3. **Configure as variáveis de ambiente**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

4. **Deploy**:
   ```bash
   # Via CLI
   npm i -g vercel
   vercel
   ```

5. **Pós-deploy**:
   - Configure o domínio personalizado (opcional)
   - Adicione o domínio ao CORS do Supabase

## Instalação como App (PWA)

### Android
1. Acesse o sistema pelo Chrome
2. Toque no menu (⋮) > "Instalar aplicativo"
3. Ou use o banner de instalação que aparece automaticamente

### iOS
1. Acesse o sistema pelo Safari
2. Toque no botão compartilhar
3. "Adicionar à Tela de Início"

## Estrutura do Projeto

```
/app
  /login              - Página de login
  /dashboard          - Dashboard principal
  /visitantes         - CRUD de visitantes
    /novo             - Novo visitante
    /[id]             - Detalhes do visitante
    /[id]/editar      - Editar visitante
  /acessos            - Registro de entradas/saídas
  /scanner            - Scanner QR Code
  /pre-cadastro       - Pré-cadastro público
  /api                - API routes
    /sync             - Endpoint de sincronização
    /pessoas/buscar   - Busca por QR Code

/components
  bottom-nav.tsx      - Navegação inferior (mobile)
  header.tsx          - Header com status online/offline
  app-layout.tsx      - Layout base das páginas protegidas

/hooks
  use-auth.ts         - Contexto de autenticação
  use-online.ts       - Hook de status de conexão

/lib
  supabase.ts         - Cliente Supabase
  indexeddb.ts        - Serviço IndexedDB
  sync.ts             - Lógica de sincronização
  storage.ts          - Upload de arquivos
  types.ts            - Tipos TypeScript
  utils.ts            - Utilitários
```

## Funcionamento Offline

O sistema utiliza IndexedDB para armazenar dados localmente:

- **Visitantes** são salvos localmente ao criar/editar
- **Acessos** são salvos localmente quando offline
- **Sincronização** automática ao reconectar
- **Botão "Sincronizar agora"** para forçar sync manual

### Indicadores visuais

- **Ícone verde** = Online
- **Ícone vermelho** = Offline
- **Loading spinner** = Sincronizando

## Primeiros Passos

1. Configure o Supabase (banco + storage)
2. Configure as variáveis de ambiente
3. Execute `npm install && npm run dev`
4. Crie a primeira conta de administrador no Supabase Auth
5. Faça login e comece a usar

## Licença

MIT

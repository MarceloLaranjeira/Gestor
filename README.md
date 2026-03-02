# Gestão de Gabinete DAN

Aplicação web para operação de gabinete parlamentar, com autenticação, controle de permissões, gestão de pessoas/demandas/eventos, módulos estratégicos de campanha, prontuário parlamentar, integrações (incluindo WhatsApp) e funções serverless no Supabase.

## Visão geral

O projeto é uma SPA em React + TypeScript com roteamento por módulo e proteção por autenticação/permissão. O backend é baseado em Supabase (Postgres, Auth e Edge Functions).

Principais áreas funcionais:

- **Operação do gabinete**: dashboard, pessoas, demandas, eventos, calendário, movimentos, relatórios e finanças.
- **Administração**: configurações, gerenciamento de usuários, permissões e coordenações.
- **Campanha**: dashboard, calhas, coordenadores, assessores, visitas, relatórios, mapa e locais.
- **Coordenação estratégica**: monitoramento, planejamento de visitas e gestão por calhas/municípios.
- **Prontuário parlamentar**: cadastro, edição, detalhes e resumo executivo de apoiadores.
- **Logbook de calhas**: visão por calha, detalhes e formulários por município.
- **Integrações**: endpoints/fluxos de integração e módulo WhatsApp.

## Stack técnica

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS + shadcn/ui + Radix
- **Estado e dados**: TanStack Query, React Hook Form, Zod
- **Roteamento**: React Router
- **Backend/infra**: Supabase (Auth, Database, Edge Functions)
- **Testes**: Vitest + Testing Library

## Estrutura do projeto

```text
.
├── src/
│   ├── components/        # Componentes reutilizáveis e UI
│   ├── contexts/          # Contextos globais (ex.: autenticação)
│   ├── hooks/             # Hooks de domínio (ex.: permissões)
│   ├── integrations/      # Integrações cliente (ex.: Supabase)
│   ├── pages/             # Páginas/rotas da aplicação
│   └── test/              # Testes
├── supabase/
│   ├── functions/         # Edge Functions
│   ├── migrations/        # Migrações SQL
│   └── config.toml        # Config local do Supabase
├── public/                # Assets estáticos
└── README.md
```

## Pré-requisitos

- Node.js 18+
- npm 9+

## Configuração de ambiente

O projeto usa variáveis em `.env` para conexão com o Supabase. Exemplo de chaves esperadas:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

> Se você estiver em outro ambiente (staging/prod), ajuste os valores antes de executar.

## Como rodar localmente

```bash
# 1) Instalar dependências
npm install

# 2) Subir ambiente de desenvolvimento
npm run dev
```

A aplicação abre em `http://localhost:5173` por padrão.

## Scripts disponíveis

- `npm run dev` — inicia o servidor de desenvolvimento (Vite)
- `npm run build` — gera build de produção
- `npm run build:dev` — gera build em modo de desenvolvimento
- `npm run preview` — serve localmente a build gerada
- `npm run lint` — executa ESLint no projeto
- `npm run test` — executa testes (Vitest)
- `npm run test:watch` — executa testes em modo watch

## Módulos e rotas (resumo)

As rotas são centralizadas em `src/App.tsx` e incluem:

- **Autenticação e acesso**: `/login`, `/acesso-negado`
- **Gabinete**: `/`, `/pessoas`, `/demandas`, `/eventos`, `/calendario`, `/movimentos`, `/relatorios`, `/financas`
- **Administração**: `/configuracoes`, `/usuarios`, `/permissoes`, `/coordenacoes`, `/coordenacao/:id`
- **Campanha**: `/campanha` e subrotas (`calhas`, `coordenadores`, `assessores`, `visitas`, `relatorios`, `mapa`, `locais`)
- **Coordenação estratégica**: `/campanha/coord/*`
- **Prontuário**: `/prontuario` e subrotas
- **Logbook**: `/logbook` e subrotas
- **Integração**: `/integracao`, `/whatsapp`, callback Google Calendar

## Supabase (backend)

A pasta `supabase/functions` contém funções para operações de IA, WhatsApp, importação, calendário e administração de usuários. As migrações em `supabase/migrations` representam a evolução do banco ao longo do projeto.

Se você for trabalhar também no backend local:

1. Instale e autentique a CLI do Supabase.
2. Inicie o stack local quando necessário (`supabase start`).
3. Aplique/acompanhe migrações conforme seu fluxo de time.

## Observações

- O lint atual do repositório possui pendências históricas em múltiplos arquivos.
- Os testes existentes estão configurados via Vitest e podem ser executados isoladamente com `npm run test`.

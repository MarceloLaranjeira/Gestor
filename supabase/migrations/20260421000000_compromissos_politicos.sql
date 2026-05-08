-- Tabela de Compromissos Políticos
create table if not exists public.compromissos_politicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  titulo text not null,
  descricao text default '',
  tipo text not null default 'reuniao',
  status text not null default 'pendente',
  prioridade text not null default 'media',
  data_inicio timestamptz not null,
  data_fim timestamptz,
  local text default '',
  municipio text default '',
  participantes text default '',
  orgao_parceiro text default '',
  pauta text default '',
  resultado text default '',
  observacoes text default '',
  responsavel text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.compromissos_politicos enable row level security;

create policy "Users can manage their own compromissos"
  on public.compromissos_politicos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger updated_at
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger compromissos_politicos_updated_at
  before update on public.compromissos_politicos
  for each row execute function public.update_updated_at_column();

-- Tabela de alertas pulsantes
create table if not exists public.alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  titulo text not null,
  mensagem text default '',
  tipo text not null default 'info', -- info | warning | danger | success
  origem text default '', -- demanda | compromisso | evento | coordenacao | logbook
  origem_id uuid,
  lido boolean default false,
  created_at timestamptz default now()
);

alter table public.alertas_sistema enable row level security;

create policy "Users can manage their own alertas"
  on public.alertas_sistema
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tabela logbook_entradas (auto-feed)
create table if not exists public.logbook_entradas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  origem text not null, -- demanda | evento | compromisso | coordenacao | pessoa
  origem_id uuid,
  acao text not null,   -- criado | atualizado | concluido | cancelado
  descricao text default '',
  dados jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.logbook_entradas enable row level security;

create policy "Users can manage their own logbook_entradas"
  on public.logbook_entradas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

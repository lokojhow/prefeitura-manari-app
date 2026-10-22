-- e-SIC Manari - migração inicial (rascunho para homologação)
-- Executar em projeto Supabase de TESTE após análise das regras municipais.
-- Não executar diretamente no banco de produção sem revisão e backup.
create extension if not exists pgcrypto;
create schema if not exists esic;

create type esic.papel_servidor as enum ('atendente','gestor','administrador');
create type esic.status_pedido as enum ('recebido','em_analise','encaminhado','respondido','indeferido','concluido');

create table esic.unidades (
 id uuid primary key default gen_random_uuid(),
 nome text not null unique,
 ativo boolean not null default true,
 criado_em timestamptz not null default now()
);

create table esic.servidores (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 unidade_id uuid references esic.unidades(id),
 papel esic.papel_servidor not null default 'atendente',
 ativo boolean not null default true,
 criado_em timestamptz not null default now()
);

create table esic.pedidos (
 id uuid primary key default gen_random_uuid(),
 numero_protocolo bigint generated always as identity unique,
 requerente_id uuid not null references auth.users(id),
 assunto text not null check (char_length(trim(assunto)) between 5 and 200),
 descricao text not null check (char_length(trim(descricao)) between 10 and 10000),
 unidade_id uuid references esic.unidades(id),
 status esic.status_pedido not null default 'recebido',
 criado_em timestamptz not null default now(),
 prazo_inicial date not null default ((current_date + 20)),
 prorrogado_em timestamptz,
 justificativa_prorrogacao text,
 prazo_final date,
 respondido_em timestamptz,
 atualizado_em timestamptz not null default now(),
 constraint prorrogacao_justificada check (
   (prorrogado_em is null and justificativa_prorrogacao is null)
   or (prorrogado_em is not null and nullif(trim(justificativa_prorrogacao),'') is not null)
 )
);
create index pedidos_requerente_data on esic.pedidos(requerente_id, criado_em desc);
create index pedidos_unidade_status on esic.pedidos(unidade_id, status);

create table esic.interacoes (
 id uuid primary key default gen_random_uuid(),
 pedido_id uuid not null references esic.pedidos(id) on delete restrict,
 autor_id uuid not null references auth.users(id),
 tipo text not null check (tipo in ('mensagem_cidadao','resposta_oficial','encaminhamento','prorrogacao','nota_interna','decisao_recurso')),
 conteudo text not null check (char_length(trim(conteudo)) between 1 and 15000),
 visivel_ao_cidadao boolean not null default false,
 criado_em timestamptz not null default now()
);
create index interacoes_pedido on esic.interacoes(pedido_id, criado_em);

create table esic.recursos (
 id uuid primary key default gen_random_uuid(),
 pedido_id uuid not null references esic.pedidos(id) on delete restrict,
 recorrente_id uuid not null references auth.users(id),
 fundamentacao text not null check (char_length(trim(fundamentacao)) between 10 and 10000),
 instancia integer not null check (instancia between 1 and 3),
 status text not null default 'recebido' check (status in ('recebido','em_analise','decidido')),
 decisao text,
 criado_em timestamptz not null default now(),
 decidido_em timestamptz,
 unique(pedido_id,instancia)
);

create table esic.auditoria (
 id bigint generated always as identity primary key,
 pedido_id uuid references esic.pedidos(id),
 ator_id uuid references auth.users(id),
 acao text not null,
 detalhes jsonb not null default '{}'::jsonb,
 criado_em timestamptz not null default now()
);

-- Helpers SECURITY DEFINER: identidade derivada de auth.uid(), nunca de dados fornecidos pelo cliente.
create or replace function esic.eh_servidor() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from esic.servidores where usuario_id=auth.uid() and ativo); $$;
create or replace function esic.eh_gestor() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from esic.servidores where usuario_id=auth.uid() and ativo and papel in ('gestor','administrador')); $$;

alter table esic.unidades enable row level security;
alter table esic.servidores enable row level security;
alter table esic.pedidos enable row level security;
alter table esic.interacoes enable row level security;
alter table esic.recursos enable row level security;
alter table esic.auditoria enable row level security;

-- Sem políticas públicas de acesso: somente usuários autenticados.
create policy unidades_leitura on esic.unidades for select to authenticated using (ativo);
create policy servidores_proprio on esic.servidores for select to authenticated using (usuario_id = auth.uid());
create policy pedidos_ler on esic.pedidos for select to authenticated
 using (requerente_id = auth.uid() or esic.eh_servidor());
create policy pedidos_criar on esic.pedidos for insert to authenticated
 with check (requerente_id = auth.uid() and status='recebido' and unidade_id is null and prorrogado_em is null and respondido_em is null);
create policy interacoes_ler on esic.interacoes for select to authenticated using (
 esic.eh_servidor()
 or (visivel_ao_cidadao and exists(select 1 from esic.pedidos p where p.id=pedido_id and p.requerente_id=auth.uid()))
);
create policy recursos_ler on esic.recursos for select to authenticated using (
 recorrente_id=auth.uid() or esic.eh_servidor()
);
-- Escritas administrativas e recursos deverão ser feitos por RPCs validadas, com trilha de auditoria.
-- Sem políticas INSERT/UPDATE/DELETE para interações, recursos, auditoria ou alteração de pedido:
-- evita que o navegador publique resposta oficial ou altere prazos por conta própria.

-- Exposição da schema 'esic' na API Supabase deve ser configurada explicitamente;
-- alternadamente utilizar funções RPC no schema public. Nenhuma service_role key no cliente.
-- ANTES DA PRODUÇÃO: implementar RPCs transacionais e regras municipais de recurso,
-- cálculo de prazos, envio de comprovantes, anexos privados, rate limit/CAPTCHA,
-- revisões de RLS, auditoria e política de retenção conforme LAI/LGPD.

-- =========================================================================
-- SENTINELA - SISTEMA DE AUTENTICAÇÃO, SENTINELAS E RASTRO EM TEMPO REAL
-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard/project/luzkwitvodcheeurvgij/sql/new)
-- =========================================================================

-- 1. TABELA DE PERFIS DE UTILIZADOR (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  sentinel_code text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis públicos para utilizadores autenticados" ON public.profiles;
CREATE POLICY "Perfis públicos para utilizadores autenticados"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Utilizador pode editar o seu próprio perfil" ON public.profiles;
CREATE POLICY "Utilizador pode editar o seu próprio perfil"
ON public.profiles
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. TABELA DE SENTINELAS (sentinels - Relação de Confiança)
CREATE TABLE IF NOT EXISTS public.sentinels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sentinel_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, sentinel_id)
);

ALTER TABLE public.sentinels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de sentinelas" ON public.sentinels;
CREATE POLICY "Permitir leitura de sentinelas"
ON public.sentinels
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir gestão de sentinelas" ON public.sentinels;
CREATE POLICY "Permitir gestão de sentinelas"
ON public.sentinels
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. TABELA DE SESSÕES "ESTOU A SER SEGUIDO(A)" (stalking_sessions)
CREATE TABLE IF NOT EXISTS public.stalking_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'resolved'
  latest_lat double precision NOT NULL,
  latest_lng double precision NOT NULL,
  latest_heading double precision,
  latest_speed double precision,
  battery_level integer DEFAULT 85,
  breadcrumbs jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone
);

ALTER TABLE public.stalking_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de sessões ativas" ON public.stalking_sessions;
CREATE POLICY "Permitir leitura de sessões ativas"
ON public.stalking_sessions
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização de sessões de perseguição" ON public.stalking_sessions;
CREATE POLICY "Permitir inserção e atualização de sessões de perseguição"
ON public.stalking_sessions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Ativar Realtime na tabela stalking_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.stalking_sessions;

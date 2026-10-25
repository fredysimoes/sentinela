-- =========================================================================
-- SENTINELA - SUPABASE DATABASE SCHEMA (100% COMPATÍVEL & SEGURO)
-- =========================================================================
-- IMPORTANTE: No editor do Supabase, certifique-se de NÃO SELECIONAR 
-- nenhuma linha com o rato antes de clicar em "RUN" (ou prima Ctrl+A / Cmd+A
-- para selecionar todo o script).
-- =========================================================================

-- 1. Tabela de Ocorrências e Perigos Comunitários
CREATE TABLE IF NOT EXISTS public.incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'dark_area', 'suspicious', 'harassment', 'theft_risk', 'hazard', 'safe_haven'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  confirmations INTEGER NOT NULL DEFAULT 1,
  dismissals INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lon ON public.incidents (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON public.incidents (category);

-- 2. Tabela de Alertas de Emergência SOS
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT 'Utilizador Sentinela',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_sos_status ON public.sos_alerts (status);
CREATE INDEX IF NOT EXISTS idx_sos_timestamp ON public.sos_alerts (timestamp DESC);

-- 3. Função RPC para incrementar confirmações de incidentes de forma atómica
CREATE OR REPLACE FUNCTION increment_confirmations(incident_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.incidents
  SET confirmations = confirmations + 1
  WHERE id = incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Políticas de Segurança (Row Level Security - RLS)
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se já existirem (para evitar erros ao reexecutar)
DROP POLICY IF EXISTS "Leitura pública de incidentes" ON public.incidents;
DROP POLICY IF EXISTS "Inserção pública de incidentes" ON public.incidents;
DROP POLICY IF EXISTS "Atualização pública de incidentes" ON public.incidents;
DROP POLICY IF EXISTS "Remoção pública de incidentes" ON public.incidents;
DROP POLICY IF EXISTS "Leitura pública de SOS" ON public.sos_alerts;
DROP POLICY IF EXISTS "Inserção pública de SOS" ON public.sos_alerts;

-- Criar políticas públicas
CREATE POLICY "Leitura pública de incidentes"
  ON public.incidents FOR SELECT
  USING (true);

CREATE POLICY "Inserção pública de incidentes"
  ON public.incidents FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Atualização pública de incidentes"
  ON public.incidents FOR UPDATE
  USING (true);

CREATE POLICY "Remoção pública de incidentes"
  ON public.incidents FOR DELETE
  USING (true);

CREATE POLICY "Leitura pública de SOS"
  ON public.sos_alerts FOR SELECT
  USING (true);

CREATE POLICY "Inserção pública de SOS"
  ON public.sos_alerts FOR INSERT
  WITH CHECK (true);

-- 5. Ativar Supabase Realtime para transmissão ao vivo para todos os telemóveis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'incidents'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'sos_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
  END IF;
END $$;

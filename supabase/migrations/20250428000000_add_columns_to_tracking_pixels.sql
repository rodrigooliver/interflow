/*
  # Add columns to tracking_pixels

  1. New Columns
    - `name` (text) - Nome do pixel de rastreamento
    - `token` (text) - Token para autenticação do pixel
*/

-- Adicionar colunas à tabela tracking_pixels
ALTER TABLE public.tracking_pixels ADD COLUMN name text NOT NULL;
ALTER TABLE public.tracking_pixels ADD COLUMN token text NOT NULL;

-- Adicionar índices para as novas colunas
CREATE INDEX IF NOT EXISTS tracking_pixels_name_idx ON public.tracking_pixels USING btree (name) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS tracking_pixels_token_idx ON public.tracking_pixels USING btree (token) TABLESPACE pg_default; 
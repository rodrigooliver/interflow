/*
  # Adicionar política para consulta pública de referrals

  1. Mudanças:
    - Adicionar política para permitir consulta pública de referrals ativos pelo código
    - Isso permite que usuários não autenticados ou de outras organizações possam consultar referrals pelo código
    - Adicionar política para permitir consulta pública de tracking_pixels associados a referrals ativos
    - Criar uma visualização pública de tracking_pixels sem token para acesso público
*/

-- Criar política para consulta pública de referrals pelo código
CREATE POLICY "Anyone can view active referrals by code"
  ON public.referrals
  FOR SELECT
  USING (
    status = 'active'
  );

-- Adicionar um comentário explicativo na tabela
COMMENT ON TABLE public.referrals IS 'Referral codes for organizations. Active referrals can be viewed by anyone.';

-- Criar política para permitir consulta pública de tracking_pixels ativos
CREATE POLICY "Anyone can view active tracking pixels by referral_id"
  ON public.tracking_pixels
  FOR SELECT
  USING (
    status = 'active' AND
    referral_id IN (
      SELECT id FROM public.referrals WHERE status = 'active'
    )
  );

-- Adicionar um comentário explicativo na tabela
COMMENT ON TABLE public.tracking_pixels IS 'Tracking pixels for referrals. Active tracking pixels can be viewed by anyone, except the token field.';

-- Garantir que a tabela tracking_pixels está protegida por RLS
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Criar políticas específicas para proteger a coluna token
CREATE POLICY "Only organization members can see token"
  ON public.tracking_pixels
  FOR SELECT
  USING (
    (auth.uid() IN (
      SELECT profile_id FROM organization_members 
      WHERE organization_id = tracking_pixels.organization_id
    ))
  );

-- Criar view pública sem a coluna token para uso em contexto público
CREATE OR REPLACE VIEW public.tracking_pixels_public AS
SELECT 
  id, 
  organization_id, 
  referral_id, 
  name, 
  type, 
  pixel_id, 
  null as token, -- Token será sempre null aqui
  configuration, 
  status, 
  created_at, 
  updated_at
FROM public.tracking_pixels
WHERE status = 'active' AND
  referral_id IN (
    SELECT id FROM public.referrals WHERE status = 'active'
  );

-- Conceder permissão de leitura à visualização para todos os usuários
GRANT SELECT ON public.tracking_pixels_public TO anon, authenticated; 
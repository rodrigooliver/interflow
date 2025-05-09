/*
  # Função para deletar organização

  1. Descrição:
    - Cria uma função que permite deletar uma organização e todos os seus dados relacionados
    - Ignora as verificações de chaves estrangeiras para garantir deleção completa
    - Só pode ser executada via backend (SECURITY DEFINER)

  2. Segurança:
    - Função marcada como SECURITY DEFINER para permitir operações privilegiadas
    - Requer autenticação e apenas superadmins podem executar
*/

-- Criação da função para deletar organização
CREATE OR REPLACE FUNCTION delete_organization(organization_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  success BOOLEAN := FALSE;
  profile_ids UUID[];
BEGIN
  -- Verificar se o usuário é superadmin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_superadmin = TRUE
  ) THEN
    RAISE EXCEPTION 'Apenas superadmins podem deletar organizações';
  END IF;

  -- Verificar se a organização existe
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = organization_id_param
  ) THEN
    RAISE EXCEPTION 'Organização não encontrada';
  END IF;

  -- Identificar perfis de usuários que pertencem apenas a esta organização
  -- Esses perfis serão excluídos após a remoção dos membros da organização
  SELECT ARRAY_AGG(member.profile_id) INTO profile_ids
  FROM organization_members member
  WHERE member.organization_id = organization_id_param
  AND NOT EXISTS (
    SELECT 1 FROM organization_members other_member
    WHERE other_member.profile_id = member.profile_id
    AND other_member.organization_id != organization_id_param
  );

  -- Desativar verificação de chaves estrangeiras temporariamente
  SET CONSTRAINTS ALL DEFERRED;

  -- Deletar dados relacionados à organização

  -- EMR/Saúde
  DELETE FROM emr_attachments WHERE organization_id = organization_id_param;
  DELETE FROM emr_certificates WHERE organization_id = organization_id_param;
  DELETE FROM emr_prescriptions WHERE organization_id = organization_id_param;
  DELETE FROM emr_medical_records WHERE organization_id = organization_id_param;
  DELETE FROM emr_consultations WHERE organization_id = organization_id_param;
  DELETE FROM emr_document_templates WHERE organization_id = organization_id_param;
  
  -- Agendamentos
  DELETE FROM schedule_notification_settings WHERE organization_id = organization_id_param;
  DELETE FROM schedule_notification_templates WHERE organization_id = organization_id_param;
  DELETE FROM appointments WHERE organization_id = organization_id_param;
  DELETE FROM schedules WHERE organization_id = organization_id_param;
  
  -- Chat e mensagens
  DELETE FROM chat_collaborators WHERE organization_id = organization_id_param;
  DELETE FROM contact_messages WHERE organization_id = organization_id_param;
  DELETE FROM message_shortcuts WHERE organization_id = organization_id_param;
  
  -- Atualizar mensagens que referenciam profiles que serão excluídos
  -- Definir sender_agent_id como NULL para mensagens da organização sendo excluída
  -- onde o sender_agent_id corresponde a um dos profiles que serão excluídos
  UPDATE messages 
  SET sender_agent_id = NULL
  WHERE organization_id = organization_id_param
  AND sender_agent_id = ANY(profile_ids);
  
  DELETE FROM messages WHERE organization_id = organization_id_param;
  DELETE FROM chat_channels WHERE organization_id = organization_id_param;
  DELETE FROM chats WHERE organization_id = organization_id_param;
  DELETE FROM whatsapp_templates WHERE organization_id = organization_id_param;
  
  -- Financeiro
  DELETE FROM financial_transaction_attachments
  WHERE transaction_id IN (
    SELECT id FROM financial_transactions
    WHERE organization_id = organization_id_param
  );
  DELETE FROM financial_transactions WHERE organization_id = organization_id_param;
  DELETE FROM financial_categories WHERE organization_id = organization_id_param;
  DELETE FROM financial_payment_methods WHERE organization_id = organization_id_param;
  DELETE FROM financial_cashier_operations WHERE cashier_id IN (
    SELECT id FROM financial_cashiers
    WHERE organization_id = organization_id_param
  );
  DELETE FROM financial_cashiers WHERE organization_id = organization_id_param;
  DELETE FROM payment_methods WHERE organization_id = organization_id_param;
  DELETE FROM invoices WHERE organization_id = organization_id_param;
  
  -- Clientes e CRM
  DELETE FROM customer_tags WHERE organization_id = organization_id_param;
  DELETE FROM customer_stage_history WHERE organization_id = organization_id_param;
  DELETE FROM customer_field_values
  WHERE field_definition_id IN (
    SELECT id FROM custom_fields_definition
    WHERE organization_id = organization_id_param
  );
  DELETE FROM crm_stages
  WHERE funnel_id IN (
    SELECT id FROM crm_funnels
    WHERE organization_id = organization_id_param
  );
  DELETE FROM crm_funnels WHERE organization_id = organization_id_param;
  DELETE FROM closure_types WHERE organization_id = organization_id_param;
  DELETE FROM tags WHERE organization_id = organization_id_param;
  DELETE FROM customers WHERE organization_id = organization_id_param;
  DELETE FROM custom_fields_definition WHERE organization_id = organization_id_param;
  
  -- Fluxos e automações
  DELETE FROM flow_triggers WHERE organization_id = organization_id_param;
  DELETE FROM flow_sessions WHERE organization_id = organization_id_param;
  DELETE FROM flows WHERE organization_id = organization_id_param;
  DELETE FROM prompts WHERE organization_id = organization_id_param;
  
  -- Integrações
  DELETE FROM webhook_logs WHERE organization_id = organization_id_param;
  DELETE FROM integrations WHERE organization_id = organization_id_param;
  DELETE FROM api_keys WHERE organization_id = organization_id_param;
  DELETE FROM stripe_customers WHERE organization_id = organization_id_param;
  
  -- Marketing e rastreamento
  DELETE FROM tracking_pixels WHERE organization_id = organization_id_param;
  DELETE FROM referrals WHERE organization_id = organization_id_param;
  
  -- Arquivos e tarefas
  DELETE FROM files WHERE organization_id = organization_id_param;
  DELETE FROM tasks WHERE organization_id = organization_id_param;
  
  -- Times e membros
  DELETE FROM service_teams WHERE organization_id = organization_id_param;
  DELETE FROM organization_members WHERE organization_id = organization_id_param;
  
  -- Assinaturas
  DELETE FROM subscriptions WHERE organization_id = organization_id_param;
  
  -- Deletar perfis de usuários que pertenciam apenas a esta organização
  IF profile_ids IS NOT NULL AND array_length(profile_ids, 1) > 0 THEN
    -- Registrar os perfis que serão excluídos (opcional, para fins de auditoria)
    RAISE NOTICE 'Excluindo % perfis de usuários que pertenciam apenas à organização %', 
      array_length(profile_ids, 1), organization_id_param;
    
    -- Verificar e tratar outras possíveis referências aos perfis que serão excluídos  
    -- Verificar se existem mensagens de outras organizações que referenciam esses perfis
    UPDATE messages 
    SET sender_agent_id = NULL
    WHERE sender_agent_id = ANY(profile_ids)
    AND organization_id != organization_id_param;
      
    -- Agora podemos excluir os perfis com segurança
    DELETE FROM profiles
    WHERE id = ANY(profile_ids);
    
    -- Excluir usuários do auth.users também
    DELETE FROM auth.users
    WHERE id = ANY(profile_ids);
  END IF;
  
  -- Finalmente, deletar a organização
  DELETE FROM organizations WHERE id = organization_id_param;

  -- Reativar verificação de chaves estrangeiras
  SET CONSTRAINTS ALL IMMEDIATE;

  success := TRUE;
  RETURN success;
EXCEPTION
  WHEN OTHERS THEN
    -- Garantir que as restrições são reativadas em caso de erro
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar comentário na função
COMMENT ON FUNCTION delete_organization(UUID) IS 'Deleta uma organização e todos os seus dados relacionados. Também remove perfis de usuários que pertenciam apenas a esta organização. Requer privilégios de superadmin.';

-- Permitir que a função seja chamada apenas por autenticados
REVOKE EXECUTE ON FUNCTION delete_organization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_organization(UUID) TO authenticated;
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook para realizar login automático usando credenciais temporárias armazenadas no localStorage.
 * Isso é usado para garantir que a sessão seja estabelecida corretamente após o cadastro.
 */
export function useAutoLogin() {
  useEffect(() => {
    const checkAndLogin = async () => {
      // Verificar se há credenciais temporárias armazenadas
      const email = localStorage.getItem('temp_auth_email');
      const password = localStorage.getItem('temp_auth_password');
      const shouldRedirect = localStorage.getItem('temp_auth_redirect');
      
      if (email && password && shouldRedirect === 'true') {
        console.log('Detectadas credenciais temporárias, tentando login automático...');
        
        try {
          // Verificar se já existe uma sessão
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (!sessionData.session) {
            // Se não houver sessão, fazer login
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (error) {
              console.error('Erro no login automático:', error);
            } else {
              console.log('Login automático realizado com sucesso');
              
              // Verificar se o perfil foi carregado
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData.session) {
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', sessionData.session.user.id)
                    .single();
                    
                  if (profileData) {
                    console.log('Perfil carregado com sucesso após login automático');
                    
                    // Verificar se a organização foi carregada
                    const { data: orgMemberData } = await supabase
                      .from('organization_members')
                      .select(`
                        organization:organizations (
                          id,
                          name,
                          slug
                        )
                      `)
                      .eq('user_id', sessionData.session.user.id)
                      .limit(1)
                      .single();
                      
                    if (orgMemberData?.organization) {
                      console.log('Organização carregada com sucesso após login automático');
                      
                      // Se estamos na página de app mas não temos acesso, recarregar a página
                      if (window.location.pathname.startsWith('/app')) {
                        console.log('Recarregando a página para garantir acesso completo');
                        window.location.reload();
                      }
                    } else {
                      console.error('Organização não encontrada após login automático');
                    }
                  } else {
                    console.error('Perfil não encontrado após login automático');
                  }
                }
              } catch (verifyError) {
                console.error('Erro ao verificar dados após login automático:', verifyError);
              }
            }
          } else {
            console.log('Sessão já existe, não é necessário login automático');
          }
        } catch (error) {
          console.error('Erro ao verificar sessão ou fazer login automático:', error);
        } finally {
          // Limpar credenciais temporárias independentemente do resultado
          localStorage.removeItem('temp_auth_email');
          localStorage.removeItem('temp_auth_password');
          localStorage.removeItem('temp_auth_redirect');
        }
      }
    };
    
    checkAndLogin();
  }, []);
} 
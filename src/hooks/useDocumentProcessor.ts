import { useMutation } from '@tanstack/react-query';
import { EmrDocumentTemplate } from '../types/medicalRecord';
import api from '../lib/api';
import { useAuthContext } from '../contexts/AuthContext';

interface ProcessDocumentVariables {
  template: EmrDocumentTemplate;
  variables: Record<string, unknown>;
  format: 'html' | 'pdf' | 'docx';
}

interface ProcessDocumentResponse {
  success: boolean;
  error?: string;
  data?: {
    blob: Blob;
    url: string;
    filename: string;
    contentType: string;
  };
}

export const useProcessDocument = () => {
  const { currentOrganizationMember } = useAuthContext();

  return useMutation<ProcessDocumentResponse, Error, ProcessDocumentVariables>({
    mutationFn: async ({ template, variables, format }) => {
      if (!currentOrganizationMember) {
        throw new Error('No organization member found');
      }

      try {
        console.log('Iniciando processamento do documento...');
        
        const response = await api.post(
          `/api/${currentOrganizationMember.organization.id}/medical/documents/process`,
          {
            template_id: template.id,
            variables,
            format,
          },
          {
            responseType: 'blob',
            headers: {
              'Accept': format === 'pdf' ? 'application/pdf' : 
                       format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 
                       'text/html'
            }
          }
        );

        console.log('Resposta recebida do servidor:', {
          status: response.status,
          headers: response.headers,
          contentType: response.headers['content-type'],
          contentDisposition: response.headers['content-disposition'],
          dataType: response.data?.type,
          dataSize: response.data?.size
        });

        // Verifica se a resposta é um blob válido
        if (!(response.data instanceof Blob)) {
          console.error('Resposta não é um blob válido');
          throw new Error('Resposta inválida do servidor');
        }

        // Verifica o tipo do conteúdo
        const contentType = response.headers['content-type'];
        if (!contentType) {
          console.error('Content-Type não encontrado na resposta');
          throw new Error('Tipo de conteúdo não especificado');
        }
        console.log('Tipo de conteúdo:', contentType);

        // Se a resposta for um JSON de erro
        if (contentType.includes('application/json')) {
          const reader = new FileReader();
          const textError = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(response.data);
          });
          
          const errorData = JSON.parse(textError);
          console.error('Erro retornado pelo servidor:', errorData);
          throw new Error(errorData.error || 'Erro desconhecido');
        }

        // Extrai o nome do arquivo
        const contentDisposition = response.headers['content-disposition'];
        const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch?.[1] || `documento.${format}`;

        // Cria um novo blob com o tipo correto
        const blob = new Blob([response.data], { type: contentType });
        
        // Cria URL para o blob
        const url = window.URL.createObjectURL(blob);
        console.log('URL do blob criada:', url);

        const result = {
          success: true,
          data: {
            blob,
            url,
            filename,
            contentType
          }
        };

        console.log('Retornando resultado:', {
          success: result.success,
          filename: result.data.filename,
          contentType: result.data.contentType,
          url: result.data.url
        });

        return result;
      } catch (error) {
        console.error('Erro no processamento do documento:', error);
        throw error;
      }
    },
    
    onSuccess: (data) => {
      console.log('Documento processado com sucesso:', data);
    },
    
    onError: (error) => {
      console.error('Erro ao processar documento:', error);
    },
    
    onSettled: (data) => {
      // Limpa a URL do blob quando a mutação é finalizada (sucesso ou erro)
      const url = data?.data?.url;
      if (url) {
        return () => {
          window.URL.revokeObjectURL(url);
        };
      }
    }
  });
}; 
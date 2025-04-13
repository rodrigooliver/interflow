import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ColorPicker } from '../ui/ColorPicker';
import { useAuthContext } from '../../contexts/AuthContext';
import { useFlows } from '../../hooks/useQueryes';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/Select';

const schema = z.object({
//   id: z.number().optional(),
  title: z.string().min(1, 'Required'),
  color: z.string().min(1, 'Required'),
  flow_id: z.string().nullable().optional().transform(val => val === '' ? null : val)
});

type FormValues = z.infer<typeof schema>;

interface TypeFormProps {
  initialValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) => Promise<void>;
}

export function TypeForm({ initialValues, onSubmit }: TypeFormProps) {
  const { t } = useTranslation('closureTypes');
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...initialValues,
      color: initialValues?.color || '#60A5FA',
      flow_id: initialValues?.flow_id || ''
    }
  });
  const { currentOrganizationMember } = useAuthContext();
  
  // Interface simplificada para o Flow retornado da query
  interface FlowListItem {
    id: string;
    name: string;
  }
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Usando o hook useFlows para buscar os fluxos
  const { data: flowsData = [], isLoading: loadingFlows, error } = useFlows(currentOrganizationMember?.organization.id);
  
  // Simplificar os dados dos fluxos para usar no Select
  const flows: FlowListItem[] = flowsData.map(flow => ({
    id: flow.id,
    name: flow.name
  }));
  
  // Mensagem de erro se houver problema ao carregar os fluxos
  const flowsError = error ? t('errors.load_flows') : null;

  // Registrar o campo flow_id e observar seu valor para o select
  register('flow_id');
  const selectedFlow = watch('flow_id') || '';

  // Função para lidar com a mudança no select
  const handleFlowChange = (value: string) => {
    setValue('flow_id', value, { shouldDirty: true, shouldValidate: true });
  };

  useEffect(() => {
    if (!initialValues?.color) {
      const colors = [
        '#60A5FA', // Azul
        '#34D399', // Verde
        '#FBBF24', // Amarelo
        '#F472B6', // Rosa
        '#A78BFA', // Lilás
        '#FB7185', // Vermelho
        '#2DD4BF', // Turquesa
        '#F59E0B', // Laranja
        '#10B981', // Esmeralda
        '#8B5CF6'  // Violeta
      ];
      const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % colors.length;
      const randomColor = colors[randomIndex];
      setValue('color', randomColor, { shouldDirty: true, shouldValidate: true });
    }
  }, [initialValues?.color, setValue]);

  const onSubmitHandler = async (values: FormValues) => {
    try {
      setIsSubmitting(true);
      
      if (!currentOrganizationMember) {
        throw new Error(t('errors.no_organization'));
      }

      const formattedValues = {
        ...values,
        organization_id: currentOrganizationMember.organization.id,
        flow_id: values.flow_id || null
      };

      await onSubmit(formattedValues);
      
    } catch (error) {
      console.error('Submission error:', error);
      alert(t('errors.submit_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4 dark:text-gray-200">
      <div className="flex gap-4 items-end">
        <div className="flex-grow relative">
          <Input
            className="dark:bg-gray-800 dark:border-gray-700 dark:text-white w-full pl-10"
            placeholder={t('form.title_placeholder')}
            {...register('title')}
          />
          {errors.title && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.title.message}
            </p>
          )}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.75 1.03l3.5 6.06a2.01 2.01 0 010 1.82l-3.5 6.06A1.99 1.99 0 0112 21H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
          </span>
        </div>
        
        <div className="flex flex-col w-24">
          <div className="flex items-center gap-2">
            <ColorPicker
              value={watch('color')}
              onChange={(color) => setValue('color', color)}
              className="border"
              showLabel={false}
            />
          </div>
          {errors.color && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">
              {errors.color.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <Select 
          value={selectedFlow}
          onValueChange={handleFlowChange}
          className={errors.flow_id || flowsError ? "border-red-500" : ""}
        >
          <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white">
            <SelectValue placeholder={t('form.select_flow')} options={flows.map(flow => ({ value: flow.id.toString(), name: flow.name }))} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('form.no_flow')}</SelectItem>
            {loadingFlows ? (
              <SelectItem value="" disabled>
                {t('loading')}...
              </SelectItem>
            ) : flows.length === 0 ? (
              <SelectItem value="" disabled>
                {t('no_flows_available')}
              </SelectItem>
            ) : (
              flows.map((flow) => (
                <SelectItem
                  key={flow.id}
                  value={flow.id.toString()}
                >
                  {flow.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {(errors.flow_id || flowsError) && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            {errors.flow_id?.message || flowsError}
          </p>
        )}
      </div>

      <Button 
        type="submit" 
        className="w-full dark:bg-blue-700 dark:hover:bg-blue-800 dark:text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {t('saving')}...
          </div>
        ) : (
          t('save')
        )}
      </Button>
    </form>
  );
} 
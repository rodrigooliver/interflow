import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { TypeForm } from '../components/closureTypes/TypeForm';
import { TypeList } from '../components/closureTypes/TypeList';
import { getClosureTypes, createClosureType, updateClosureType, deleteClosureType } from '../services/closureTypeService';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { ClosureType } from '../types/database';

export function ClosureTypesPage() {
  const { t } = useTranslation('closureTypes');
  const { currentOrganization } = useOrganizationContext();
  const [types, setTypes] = useState<ClosureType[]>([]);
  const [selectedType, setSelectedType] = useState<ClosureType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentOrganization?.id) {
      loadTypes();
    }
  }, [currentOrganization]);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const data = await getClosureTypes(currentOrganization?.id || '');
      setTypes(data);
    } catch (error) {
      console.error('Error loading types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: Omit<ClosureType, 'id' | 'created_at'>) => {
    try {
      if (selectedType?.id) {
        await updateClosureType(selectedType.id, values);
      } else {
        await createClosureType(values);
      }
      loadTypes();
      setShowForm(false);
      setSelectedType(null);
    } catch (error) {
      console.error('Error saving type:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteClosureType(id);
        loadTypes();
    } catch (error) {
        console.error('Error deleting type:', error);
    }
};

  return (
    <div className="p-6 max-w-4xl mx-auto dark:bg-gray-900 dark:text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button onClick={() => setShowForm(true)}>
          {t('newType')}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {t('loading')}...
        </div>
      ) : (
        <TypeList
          types={types}
          onEdit={(type) => {
            setSelectedType(type);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedType(null);
        }}
        title={selectedType ? t('editType') : t('newType')}
      >
        <TypeForm
          initialValues={selectedType || undefined}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
} 
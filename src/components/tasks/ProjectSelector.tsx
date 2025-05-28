import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, ChevronDown, PlusCircle } from 'lucide-react';
import { TaskProject } from '../../types/tasks';

interface ProjectSelectorProps {
  projects: TaskProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onAddProject: () => void;
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  onAddProject
}: ProjectSelectorProps) {
  const { t } = useTranslation('tasks');
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedProject = selectedProjectId 
    ? projects.find(p => p.id === selectedProjectId) 
    : null;
  
  // Selecionar automaticamente o primeiro projeto se nenhum estiver selecionado
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      onSelectProject(projects[0].id);
    }
  }, [selectedProjectId, projects, onSelectProject]);

  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Adicionar listener quando o dropdown estiver aberto
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Remover listener quando o componente for desmontado ou o dropdown for fechado
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);
  
  // Caso não tenha projetos, mostrar mensagem
  if (projects.length === 0) {
    return (
      <div className="relative">
        <button
          onClick={onAddProject}
          className="flex items-center justify-between px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-md text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50"
        >
          <div className="flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>{t('projects.addProject')}</span>
          </div>
        </button>
      </div>
    );
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-300 min-w-[140px] max-w-[140px] truncate hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <div className="flex items-center truncate">
          <Briefcase className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
          <span className="truncate">
            {selectedProject 
              ? selectedProject.name 
              : t('projects.selectProject')
            }
          </span>
        </div>
        <ChevronDown className="w-4 h-4 ml-2" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
          <div className="py-1">            
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-4 py-2 text-sm text-left ${
                  selectedProjectId === project.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {project.name}
              </button>
            ))}
            
            <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => {
                  onAddProject();
                  setIsOpen(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-left text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('projects.addProject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
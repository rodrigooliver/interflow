import React from 'react';
import Select, { 
  StylesConfig, 
  ControlProps, 
  OptionProps, 
  CSSObjectWithLabel,
  components,
  SingleValueProps
} from 'react-select';
import { Plus } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  isHtml?: boolean;
  description?: string;
}

interface SearchableSelectFieldProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder: string;
  id?: string;
  className?: string;
  isDisabled?: boolean;
  onAddNew?: () => void;
  showAddButton?: boolean;
}

// Componente personalizado para exibir labels com HTML
const CustomOption = (props: OptionProps<SelectOption, false>) => {
  const { data } = props;
  
  if (data.isHtml) {
    return (
      <components.Option {...props}>
        <div dangerouslySetInnerHTML={{ __html: data.label }} />
      </components.Option>
    );
  }
  
  return <components.Option {...props} />;
};

// Componente para exibir o valor selecionado com HTML
const CustomSingleValue = (props: SingleValueProps<SelectOption, false>) => {
  const { data } = props;
  
  if (data.isHtml) {
    return (
      <components.SingleValue {...props}>
        <div dangerouslySetInnerHTML={{ __html: data.label }} />
      </components.SingleValue>
    );
  }
  
  return <components.SingleValue {...props} />;
};

const SearchableSelectField: React.FC<SearchableSelectFieldProps> = ({
  options,
  value,
  onChange,
  placeholder,
  id,
  className = '',
  isDisabled = false,
  onAddNew,
  showAddButton = false
}) => {
  // Encontrar a opção selecionada
  const selectedOption = value ? options.find(option => option.value === value) : null;

  // Lidar com a mudança
  const handleChange = (option: SelectOption | null) => {
    onChange(option ? option.value : null);
  };

  const customStyles: StylesConfig<SelectOption, false> = {
    control: (baseStyles: CSSObjectWithLabel, state: ControlProps<SelectOption, false>) => ({
      ...baseStyles,
      backgroundColor: 'var(--select-bg, white)',
      borderColor: state.isFocused ? 'var(--select-focus-border, #3b82f6)' : 'var(--select-border, #d1d5db)',
      boxShadow: state.isFocused ? '0 0 0 1px var(--select-focus-border, #3b82f6)' : 'none',
      '&:hover': {
        borderColor: 'var(--select-hover-border, #9ca3af)'
      },
      borderRadius: '0.375rem',
      padding: '2px 8px',
      minHeight: '38px'
    }),
    menu: (baseStyles: CSSObjectWithLabel) => ({
      ...baseStyles,
      zIndex: 9999,
      backgroundColor: 'var(--select-bg, white)',
      borderColor: 'var(--select-border, #d1d5db)',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderRadius: '0.375rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }),
    option: (baseStyles: CSSObjectWithLabel, state: OptionProps<SelectOption, false>) => ({
      ...baseStyles,
      backgroundColor: state.isSelected 
        ? 'var(--select-selected-bg, #3b82f6)' 
        : state.isFocused 
          ? 'var(--select-hover-bg, #f3f4f6)' 
          : 'transparent',
      color: state.isSelected 
        ? 'var(--select-selected-text, white)' 
        : 'var(--select-text, #111827)',
      padding: '8px 12px',
      cursor: 'pointer'
    }),
    singleValue: (baseStyles: CSSObjectWithLabel) => ({
      ...baseStyles,
      color: 'var(--select-text, #111827)'
    }),
    input: (baseStyles: CSSObjectWithLabel) => ({
      ...baseStyles,
      color: 'var(--select-text, #111827)'
    }),
    placeholder: (baseStyles: CSSObjectWithLabel) => ({
      ...baseStyles,
      color: 'var(--select-placeholder, #9ca3af)'
    }),
    indicatorSeparator: (baseStyles: CSSObjectWithLabel) => ({
      ...baseStyles,
      display: 'none'
    })
  };

  return (
    <div className="relative">
      <Select
        id={id}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        placeholder={placeholder}
        className={`react-select-container ${className}`}
        classNamePrefix="react-select"
        styles={customStyles}
        isDisabled={isDisabled}
        isClearable
        isSearchable
        components={{ 
          Option: CustomOption,
          SingleValue: CustomSingleValue
        }}
      />
      {showAddButton && onAddNew && (
        <button
          type="button"
          onClick={onAddNew}
          className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors z-10"
          title="Adicionar nova categoria"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchableSelectField; 
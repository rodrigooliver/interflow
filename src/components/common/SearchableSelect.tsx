import React from 'react';
import Select, { Props as SelectProps } from 'react-select';

interface SearchableSelectProps extends Omit<SelectProps, 'styles'> {
  darkMode?: boolean;
}

export function SearchableSelect({ darkMode, ...props }: SearchableSelectProps) {
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: 'var(--select-bg)',
      borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
      '&:hover': {
        borderColor: 'var(--select-hover-border)'
      }
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: 'var(--select-bg)',
      border: '1px solid var(--select-border)'
    }),
    option: (base: any, { isFocused, isSelected }: any) => ({
      ...base,
      backgroundColor: isSelected 
        ? 'var(--select-selected-bg)'
        : isFocused 
          ? 'var(--select-hover-bg)'
          : 'transparent',
      color: isSelected 
        ? 'var(--select-selected-text)'
        : 'var(--select-text)'
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'var(--select-text)'
    })
  };

  return (
    <Select
      {...props}
      className="react-select-container"
      classNamePrefix="react-select"
      styles={selectStyles}
      isClearable
    />
  );
} 
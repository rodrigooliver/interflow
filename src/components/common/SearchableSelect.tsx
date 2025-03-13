import React from 'react';
import Select, { Props as SelectProps, GroupBase, CSSObjectWithLabel } from 'react-select';

interface SearchableSelectProps<T> extends Omit<SelectProps<T, boolean, GroupBase<T>>, 'styles'> {
  isMulti?: boolean;
}

export function SearchableSelect<T>({ ...props }: SearchableSelectProps<T>) {
  const selectStyles = {
    control: (base: CSSObjectWithLabel, state: { isFocused: boolean }) => ({
      ...base,
      backgroundColor: 'var(--select-bg)',
      borderColor: state.isFocused ? 'var(--select-focus-border)' : 'var(--select-border)',
      '&:hover': {
        borderColor: 'var(--select-hover-border)'
      }
    }),
    menu: (base: CSSObjectWithLabel) => ({
      ...base,
      backgroundColor: 'var(--select-bg)',
      border: '1px solid var(--select-border)'
    }),
    option: (base: CSSObjectWithLabel, { isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) => ({
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
    singleValue: (base: CSSObjectWithLabel) => ({
      ...base,
      color: 'var(--select-text)'
    })
  };

  return (
    <Select<T, boolean, GroupBase<T>>
      {...props}
      className="react-select-container"
      classNamePrefix="react-select"
      styles={selectStyles}
      isClearable
    />
  );
} 
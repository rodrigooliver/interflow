import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  placeholderClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, placeholderClassName, children, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          ref={ref}
          className={`w-full px-3 py-2 border rounded-md transition-colors
            bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:bg-gray-800 dark:border-gray-700 dark:text-white 
            dark:focus:ring-blue-500 dark:focus:border-blue-500
            ${error ? 'border-red-500 dark:border-red-400' : 'border-gray-300'}
            ${className || ''}`}
          {...props}
        >
          {children}
        </select>
        
        {error && (
          <p className="text-red-500 dark:text-red-400 text-sm mt-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select'; 
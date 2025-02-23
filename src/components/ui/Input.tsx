import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <div>
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded-md transition-colors
            ${error ? 'border-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}
            ${className || ''}
            dark:bg-gray-800 dark:border-gray-700 dark:text-white 
            dark:focus:ring-blue-500 dark:focus:border-blue-500`}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
); 
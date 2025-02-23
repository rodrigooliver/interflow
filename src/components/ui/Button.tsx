import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger';
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const baseStyle = 'px-4 py-2 rounded-md transition-colors font-medium';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };
  
  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${className || ''}`}
      {...props}
    />
  );
} 
import React from 'react';
import { twMerge } from 'tailwind-merge';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      className={twMerge(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Label.displayName = "Label";

export { Label }; 
import * as React from "react";
import { cn } from "../../lib/utils";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "default" | "muted" | "small";
}

export function Text({ 
  className, 
  variant = "default",
  ...props 
}: TextProps) {
  return (
    <p
      className={cn(
        "leading-7",
        variant === "muted" && "text-muted-foreground",
        variant === "small" && "text-sm font-medium leading-none",
        className
      )}
      {...props}
    />
  );
}
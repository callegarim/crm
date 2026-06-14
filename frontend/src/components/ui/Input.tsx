import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Input BMW M — dark surface, hairline border, 48px height, 0px radius.
 * Focus state: white border.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-input w-full bg-card px-4 py-3',
          'text-body-md font-light text-ink',
          'border border-hairline rounded-none',
          'placeholder:text-muted',
          'focus:border-ink focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'transition-fast',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

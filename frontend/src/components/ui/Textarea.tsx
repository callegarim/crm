import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Textarea BMW M — dark surface, hairline border, 0px radius.
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[120px] w-full bg-card px-4 py-3',
          'text-body-md font-light text-ink',
          'border border-hairline rounded-none',
          'placeholder:text-muted',
          'focus:border-ink focus:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'resize-y transition-fast',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };

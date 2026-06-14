import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-machined transition-fast',
  {
    variants: {
      variant: {
        default: 'bg-elevated text-body-strong',
        bot: 'badge-bot',
        human: 'badge-human',
        closed: 'badge-closed',
        warning: 'badge-warning',
        success: 'badge-success',
        active: 'bg-success/20 text-success',
        inactive: 'bg-muted/20 text-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

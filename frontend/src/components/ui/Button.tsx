import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  /* Base: BMW M button — UPPERCASE, machined letter-spacing, no border-radius */
  'inline-flex items-center justify-center whitespace-nowrap text-button uppercase tracking-machined font-bold transition-fast disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        /* Primary: canvas bg + white text + hairline border */
        primary:
          'bg-canvas text-ink border border-ink hover:bg-ink hover:text-canvas',

        /* Outline: transparent + white border */
        outline:
          'bg-transparent text-ink border border-ink hover:bg-ink/10',

        /* Ghost: no border, subtle hover */
        ghost:
          'bg-transparent text-ink hover:bg-elevated border-none',

        /* Danger: red accent */
        danger:
          'bg-transparent text-m-red border border-m-red hover:bg-m-red hover:text-ink',

        /* M-Blue: primary action with brand blue */
        'm-blue':
          'bg-m-blue text-ink border border-m-blue hover:bg-m-blue/80',
      },
      size: {
        default: 'h-btn px-8 text-button',
        sm: 'h-9 px-4 text-[12px]',
        lg: 'h-14 px-10 text-[16px]',
        icon: 'h-btn w-btn rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

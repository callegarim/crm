import { cn } from '@/lib/utils';

interface MStripeProps {
  className?: string;
}

/**
 * M-Stripe — Tricolor decorativo BMW M.
 * 4px height, gradiente: #0066b1 → #1c69d4 → #e22718
 *
 * REGRA ABSOLUTA: Usar APENAS como divisor decorativo.
 * NUNCA como fill de botão ou surface.
 */
export function MStripe({ className }: MStripeProps) {
  return <div className={cn('m-stripe', className)} />;
}

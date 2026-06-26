import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '#/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-brand-action text-primary-foreground shadow-brand hover:brightness-[1.06] hover:-translate-y-px',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-accent',
        outline:
          'border border-input bg-card shadow-sm hover:border-brand hover:text-brand-strong',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        soft: 'bg-brand-soft text-brand-strong hover:brightness-[0.97]',
        link: 'text-brand underline-offset-4 hover:underline',
        destructive: 'bg-destructive text-white shadow-sm hover:opacity-90',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-3.5',
        lg: 'h-11 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = 'Button';

export { buttonVariants };

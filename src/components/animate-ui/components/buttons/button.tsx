'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from '@/components/animate-ui/primitives/buttons/button';
import { useT, wording } from '@/components/t';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[box-shadow,_color,_background-color,_border-color,_outline-color,_text-decoration-color,_fill,_stroke] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        gold: 'bg-linear-to-b from-[#D9BC7E] to-gold text-navy-deep shadow-xs hover:brightness-105',
        accent: 'bg-accent text-accent-foreground shadow-xs hover:bg-accent/90',
        destructive:
          'text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/20',
        outline:
          'border bg-card shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonPrimitiveProps & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, asChild, ...given }: ButtonProps) {
  // The dashboard's wording on a button, visible or read out, follows the dashboard's language.
  const t = useT();
  const label = given['aria-label'];
  const props = { ...given, 'aria-label': label === undefined ? undefined : t(label) };
  // A link dressed as a button (`asChild`) goes through Radix's slot, with the press feedback
  // in CSS. Upstream's motion slot wraps the child in motion.create(), which crashes on a
  // `Link` handed over from a Server Component.
  if (asChild) {
    return (
      <Slot.Root
        className={cn(buttonVariants({ variant, size, className }), 'transition-transform active:scale-[0.97]')}
        {...(props as React.ComponentProps<typeof Slot.Root>)}
      />
    );
  }
  return (
    <ButtonPrimitive
      hoverScale={1}
      tapScale={0.97}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {wording(props.children as React.ReactNode)}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants, type ButtonProps };

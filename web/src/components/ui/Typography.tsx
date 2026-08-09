import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type HeadingLevel = 'display' | 1 | 2 | 3;

const headingClassByLevel: Record<HeadingLevel, string> = {
  display: 'text-display',
  1: 'text-heading-1',
  2: 'text-heading-2',
  3: 'text-heading-3',
};

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  children: ReactNode;
}

export function Heading({ level = 1, className, children, ...props }: HeadingProps) {
  const Tag = level === 'display' ? 'h1' : (`h${level}` as 'h1' | 'h2' | 'h3');
  return (
    <Tag className={cn(headingClassByLevel[level], className)} {...props}>
      {children}
    </Tag>
  );
}

type TextVariant = 'body' | 'body-sm' | 'caption';

const textClassByVariant: Record<TextVariant, string> = {
  body: 'text-body',
  'body-sm': 'text-body-sm',
  caption: 'text-caption',
};

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  children: ReactNode;
}

export function Text({ variant = 'body', className, children, ...props }: TextProps) {
  return (
    <p className={cn(textClassByVariant[variant], className)} {...props}>
      {children}
    </p>
  );
}

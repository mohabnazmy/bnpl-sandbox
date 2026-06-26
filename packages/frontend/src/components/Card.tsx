import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  const classes = ['card', onClick ? 'card-clickable' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';

interface FadeInProps {
  children: React.ReactNode;
  as?: React.ElementType;
  delay?: number;
  duration?: number;
  className?: string;
  [key: string]: any;
}

export default function FadeIn({ 
  children, 
  as: Component = 'div', 
  delay = 0, 
  duration = 600, 
  className = '', 
  ...rest 
}: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <Component
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export { FadeIn };

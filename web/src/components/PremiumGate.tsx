import React from 'react';

interface Props {
  children: React.ReactNode;
  message?: string;
  feature?: string;
}

export default function PremiumGate({ children }: Props) {
  return <>{children}</>;
}

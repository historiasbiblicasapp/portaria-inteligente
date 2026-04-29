'use client';

import React from 'react';

interface QRCodeProps {
  value: string;
  size?: number;
}

export const QRCodeComponent: React.FC<QRCodeProps> = ({ value, size = 200 }) => {
  const [QR, setQR] = React.useState<React.ComponentType<{ value: string; size?: number }> | null>(null);

  React.useEffect(() => {
    import('react-qr-code').then(mod => {
      setQR(() => mod.default as unknown as React.ComponentType<{ value: string; size?: number }>);
    });
  }, []);

  if (!QR) return <div style={{ width: size, height: size }} className="bg-gray-100 rounded" />;

  return <QR value={value} size={size} />;
};

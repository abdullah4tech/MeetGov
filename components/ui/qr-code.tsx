"use client";

import { useEffect, useState } from "react";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 200, className }: QRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!value) {
      setError(true);
      return;
    }

    // Generate QR code using a simple API approach that works client-side
    // Using Google Charts API as a fallback for simplicity
    const encodedValue = encodeURIComponent(value);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}&format=svg`;
    
    setQrDataUrl(qrUrl);
    setError(false);
  }, [value, size]);

  if (error || !qrDataUrl) {
    return (
      <div
        className={`bg-muted flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-muted-foreground text-sm">QR Code</span>
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

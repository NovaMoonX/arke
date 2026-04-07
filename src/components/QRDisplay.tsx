import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { Button } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';

interface QRDisplayProps {
  pin: string;
  className?: string;
}

export function QRDisplay({ pin, className }: QRDisplayProps) {
  const [copied, setCopied] = useState(false);

  const joinUrl = `${window.location.origin}/join/${pin}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = pin;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={join('flex flex-col items-center space-y-6', className)}>
      {/* QR Code */}
      <div className='rounded-xl bg-white p-4'>
        <QRCodeSVG value={joinUrl} size={200} level='M' />
      </div>

      {/* PIN Display */}
      <div className='text-center'>
        <p className='text-sm text-foreground/60'>Session PIN</p>
        <p className='font-mono text-4xl font-bold tracking-widest'>{pin}</p>
      </div>

      {/* Copy Button */}
      <Button onClick={handleCopy} variant='secondary'>
        {copied ? '✓ Copied!' : 'Copy PIN'}
      </Button>

      {/* Join URL */}
      <p className='max-w-xs break-all text-center text-xs text-foreground/40'>
        {joinUrl}
      </p>
    </div>
  );
}

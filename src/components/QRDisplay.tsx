import { QRCodeSVG } from 'qrcode.react';
import { CopyButton } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';

interface QRDisplayProps {
  pin: string;
  className?: string;
}

export function QRDisplay({ pin, className }: QRDisplayProps) {
  const joinUrl = `${window.location.origin}/join/${pin}`;

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

      {/* Copy Buttons */}
      <div className='flex flex-col items-center gap-2'>
        <CopyButton textToCopy={joinUrl} variant='secondary' showCopyText>
          Copy Link
        </CopyButton>
        <CopyButton textToCopy={pin} variant='tertiary' size='sm' showCopyText>
          Copy PIN only
        </CopyButton>
      </div>

      {/* Join URL */}
      <p className='max-w-xs break-all text-center text-xs text-foreground/40'>
        {joinUrl}
      </p>
    </div>
  );
}

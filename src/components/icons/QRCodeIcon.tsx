import { join } from '@moondreamsdev/dreamer-ui/utils';

interface QRCodeIconProps {
  className?: string;
}

export function QRCodeIcon({ className }: QRCodeIconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      width='24'
      height='24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={join('inline-block shrink-0', className)}
    >
      <rect width='5' height='5' x='3' y='3' rx='1' />
      <rect width='5' height='5' x='16' y='3' rx='1' />
      <rect width='5' height='5' x='3' y='16' rx='1' />
      <path d='M21 16h-3a2 2 0 0 0-2 2v3m5 0v.01M12 7v3a2 2 0 0 1-2 2H7m-4 0h.01M12 3h.01M12 16v.01M16 12h1m4 0v.01M12 21v-1' />
    </svg>
  );
}

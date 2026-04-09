import { join } from '@moondreamsdev/dreamer-ui/utils';

interface ImageIconProps {
  className?: string;
}

export function ImageIcon({ className }: ImageIconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      width='24'
      height='24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={join('inline-block shrink-0', className)}
    >
      <rect width='18' height='18' x='3' y='3' rx='2' ry='2' />
      <circle cx='8.5' cy='8.5' r='1.5' />
      <polyline points='21 15 16 10 5 21' />
    </svg>
  );
}

import { join } from '@moondreamsdev/dreamer-ui/utils';

interface VideoIconProps {
  className?: string;
}

export function VideoIcon({ className }: VideoIconProps) {
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
      <rect width='18' height='18' x='3' y='3' rx='2' />
      <polygon points='10 8 16 12 10 16 10 8' />
    </svg>
  );
}

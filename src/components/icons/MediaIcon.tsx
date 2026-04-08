import { join } from '@moondreamsdev/dreamer-ui/utils';

interface MediaIconProps {
  className?: string;
}

export function MediaIcon({ className }: MediaIconProps) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      width='24'
      height='24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={join('inline-block shrink-0', className)}
    >
      <path d='M35.757 42.45H10.26a4.75 4.75 0 0 1-4.76-4.758V12.235' />
      <rect
        width='28.788'
        height='28.788'
        x='13.712'
        y='5.549'
        rx='3.112'
        ry='3.112'
      />
      <path d='M17.684 28.215h20.54l-7.072-8.923l-4.63 5.935l-3.24-3.746z' />
    </svg>
  );
}

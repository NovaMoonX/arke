import { join } from '@moondreamsdev/dreamer-ui/utils';
import { ExclamationTriangle, CheckCircled } from '@moondreamsdev/dreamer-ui/symbols';
import { useAutoReconnect, type ReconnectStatus } from '@hooks/useAutoReconnect';

/**
 * Thin banner that appears at the top of the viewport when the network
 * is disconnected or Firebase is reconnecting.
 * Rendered inside the page flow so it pushes content down.
 */
export function NetworkBanner() {
  const { status, online } = useAutoReconnect();

  if (status === 'connected' && online) return null;

  const label = labelForStatus(status, online);
  const variant = status === 'reconnecting' ? 'warning' : 'error';
  const Icon = status === 'reconnecting' ? CheckCircled : ExclamationTriangle;

  return (
    <div
      role='alert'
      aria-live='assertive'
      className={join(
        'flex shrink-0 items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium text-white',
        variant === 'error' && 'bg-destructive',
        variant === 'warning' && 'bg-yellow-600',
      )}
    >
      <Icon className='h-4 w-4 shrink-0' />
      <span>{label}</span>
    </div>
  );
}

function labelForStatus(status: ReconnectStatus, online: boolean): string {
  if (!online) return 'You are offline. Changes will sync when reconnected.';
  if (status === 'reconnecting') return 'Reconnecting…';
  return 'Connection lost.';
}

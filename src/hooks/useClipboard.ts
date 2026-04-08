import { useCallback } from 'react';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';

interface UseClipboardReturn {
  writeToClipboard: (text: string) => Promise<void>;
  readFromClipboard: () => Promise<string>;
}

/**
 * Provides clipboard operations with toast feedback.
 * Handles permission errors gracefully.
 */
export function useClipboard(): UseClipboardReturn {
  const { addToast } = useToast();

  const writeToClipboard = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        addToast({ title: 'Copied to clipboard', type: 'success' });
      } catch (err) {
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Clipboard permission denied'
            : 'Failed to copy to clipboard';
        addToast({ title: message, type: 'error' });
      }
    },
    [addToast],
  );

  const readFromClipboard = useCallback(async (): Promise<string> => {
    try {
      const result = await navigator.clipboard.readText();
      return result;
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Clipboard permission denied'
          : 'Failed to read from clipboard';
      addToast({ title: message, type: 'error' });
      return '';
    }
  }, [addToast]);

  const returnValue: UseClipboardReturn = {
    writeToClipboard,
    readFromClipboard,
  };

  return returnValue;
}

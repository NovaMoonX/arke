import { useState, useCallback } from 'react';

interface UseWebShareReturn {
  shareFile: (url: string, fileName: string) => Promise<void>;
  canShare: boolean;
  sharing: boolean;
  error: string | null;
}

export function useWebShare(): UseWebShareReturn {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const shareFile = useCallback(
    async (url: string, fileName: string): Promise<void> => {
      setError(null);

      // Try native Web Share API first
      if (navigator.share) {
        setSharing(true);
        try {
          // Attempt to share the URL (file sharing requires fetching the blob)
          const canShareFiles =
            navigator.canShare && navigator.canShare({ files: [] as File[] });

          if (canShareFiles) {
            // Fetch the file and share as a File object
            const response = await fetch(url);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: blob.type });

            const shareData = { files: [file], title: fileName };
            if (navigator.canShare(shareData)) {
              await navigator.share(shareData);
              setSharing(false);
              return;
            }
          }

          // Fallback: share URL only
          await navigator.share({ title: fileName, url });
          setSharing(false);
          return;
        } catch (err) {
          // User cancelled is not an error
          if (err instanceof Error && err.name === 'AbortError') {
            setSharing(false);
            return;
          }
          // Fall through to download fallback
        }
        setSharing(false);
      }

      // Fallback: trigger download
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Download failed';
        setError(message);
      }
    },
    [],
  );

  const result: UseWebShareReturn = {
    shareFile,
    canShare,
    sharing,
    error,
  };

  return result;
}

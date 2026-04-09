import { useState, useCallback } from 'react';
import { getDownloadURL } from 'firebase/storage';
import { useSessionContext } from '@hooks/useSessionContext';
import { auth } from '@lib/firebase';
import {
  validateFile,
  uploadFile,
  saveMediaMetadata,
  deriveMediaType,
} from '@lib/firebase/storage';

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export interface MediaUploadResult {
  id: string;
  downloadURL: string;
}

interface UseMediaUploadReturn {
  uploadMedia: (file: File) => Promise<MediaUploadResult | null>;
  uploading: boolean;
  progress: number;
  error: string | null;
}

export function useMediaUpload(): UseMediaUploadReturn {
  const { session } = useSessionContext();
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const uploadMedia = useCallback(
    async (file: File): Promise<MediaUploadResult | null> => {
      const userId = auth?.currentUser?.uid;
      if (!session || !userId) {
        setState((prev) => ({
          ...prev,
          error: 'No active session or not authenticated.',
        }));
        return null;
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setState((prev) => ({ ...prev, error: validationError }));
        return null;
      }

      setState({ uploading: true, progress: 0, error: null });

      const task = uploadFile(session.pin, file, userId);
      if (!task) {
        setState({ uploading: false, progress: 0, error: 'Storage not available.' });
        return null;
      }

      return new Promise<MediaUploadResult | null>((resolve) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            );
            setState((prev) => ({ ...prev, progress: pct }));
          },
          (err) => {
            setState({
              uploading: false,
              progress: 0,
              error: `Upload failed: ${err.message}`,
            });
            resolve(null);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(task.snapshot.ref);

              const mediaId = await saveMediaMetadata(session.pin, {
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                downloadURL,
                storagePath: task.snapshot.ref.fullPath,
                uploadedBy: userId,
                uploadedAt: Date.now(),
                mediaType: deriveMediaType(file.type),
              });

              setState({ uploading: false, progress: 100, error: null });
              resolve(mediaId ? { id: mediaId, downloadURL } : null);
            } catch (err) {
              const message =
                err instanceof Error ? err.message : 'Unknown error';
              setState({
                uploading: false,
                progress: 0,
                error: `Failed to save metadata: ${message}`,
              });
              resolve(null);
            }
          },
        );
      });
    },
    [session],
  );

  const result: UseMediaUploadReturn = {
    uploadMedia,
    uploading: state.uploading,
    progress: state.progress,
    error: state.error,
  };

  return result;
}

import { useState, useRef, useCallback } from 'react';
import { Button, Callout } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { X } from '@moondreamsdev/dreamer-ui/symbols';
import { useMediaUpload } from '@hooks/useMediaUpload';
import { MAX_FILE_SIZE } from '@lib/firebase/storage';

const ACCEPTED = 'image/*,application/pdf';
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1024 * 1024;

interface MediaPickerProps {
  className?: string;
}

export function MediaPicker({ className }: MediaPickerProps) {
  const { uploadMedia, uploading, progress, error } = useMediaUpload();
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    // Quick client-side validation
    if (file.size > MAX_FILE_SIZE) {
      return;
    }

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview({ url, file });
    } else {
      // For non-image files (PDF), skip preview and upload directly
      setPreview({ url: '', file });
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!preview) return;

    await uploadMedia(preview.file);

    // Clean up preview
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview, uploadMedia]);

  const handleCancelPreview = useCallback(() => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }, [preview]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < BYTES_PER_KB) return `${bytes} B`;
    if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
    const result = `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
    return result;
  };

  return (
    <div className={join('space-y-3', className)}>
      {/* Error display */}
      {error && <Callout variant='destructive' description={error} />}

      {/* Upload progress */}
      {uploading && (
        <div className='space-y-2'>
          <div className='flex items-center justify-between text-sm'>
            <span className='text-foreground/60'>Uploading…</span>
            <span className='font-mono text-foreground/80'>{progress}%</span>
          </div>
          <div className='h-2 w-full overflow-hidden rounded-full bg-foreground/10'>
            <div
              className='h-full rounded-full bg-primary transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && !uploading && (
        <div className='rounded-lg border border-foreground/10 p-3'>
          <div className='flex items-start gap-3'>
            {preview.url ? (
              <img
                src={preview.url}
                alt='Preview'
                className='h-20 w-20 rounded-md object-cover'
              />
            ) : (
              <div className='flex h-20 w-20 items-center justify-center rounded-md bg-foreground/5 text-2xl'>
                📄
              </div>
            )}
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>
                {preview.file.name}
              </p>
              <p className='text-xs text-foreground/60'>
                {formatFileSize(preview.file.size)}
              </p>
              <div className='mt-2 flex gap-2'>
                <Button size='sm' onClick={handleUpload}>
                  Upload
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  onClick={handleCancelPreview}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drop zone / file picker */}
      {!preview && !uploading && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={join(
            'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-foreground/20 hover:border-foreground/40',
          )}
        >
          <p className='text-sm text-foreground/60'>
            Tap to select or drag &amp; drop a file
          </p>
          <p className='mt-1 text-xs text-foreground/40'>
            Images &amp; PDFs up to 10MB
          </p>
          <input
            ref={inputRef}
            type='file'
            accept={ACCEPTED}
            onChange={handleInputChange}
            className='hidden'
          />
        </div>
      )}
    </div>
  );
}

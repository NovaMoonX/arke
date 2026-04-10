import { useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Textarea,
  Callout,
} from '@moondreamsdev/dreamer-ui/components';
import { Trash } from '@moondreamsdev/dreamer-ui/symbols';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';
import { useAuth } from '@hooks/useAuth';
import { createCache } from '@lib/firebase/caches';
import {
  validateFile,
  uploadFile,
  deriveMediaType,
} from '@lib/firebase/storage';
import { getDownloadURL } from 'firebase/storage';
import { auth } from '@lib/firebase';
import type { CacheItem } from '@lib/types';
import { CachePromotion } from '@components/CachePromotion';
import { ProfileSetup } from '@components/ProfileSetup';
import { LinkIcon } from '@components/icons/LinkIcon';
import { TextIcon } from '@components/icons/TextIcon';
import { ImageIcon } from '@components/icons/ImageIcon';
import { VideoIcon } from '@components/icons/VideoIcon';
import { FileIcon } from '@components/icons/FileIcon';

type AddMode = 'text' | 'link' | 'file';

/** Simple URL validation */
function isValidURL(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getItemIcon(item: CacheItem) {
  switch (item.type) {
    case 'text':
      return <TextIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'link':
      return <LinkIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'image':
      return <ImageIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    case 'video':
      return <VideoIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
    default:
      return <FileIcon className='h-4 w-4 shrink-0 text-foreground/50' />;
  }
}

function getItemLabel(item: CacheItem): string {
  if (item.type === 'text') {
    const preview = (item.content || '').slice(0, 60);
    return preview.length < (item.content || '').length
      ? preview + '…'
      : preview;
  }
  if (item.type === 'link') return item.content || '';
  return item.fileName || 'File';
}

export function CreateCache() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, needsProfile } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [items, setItems] = useState<CacheItem[]>([]);
  const [addMode, setAddMode] = useState<AddMode>('text');
  const [textInput, setTextInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addTextItem = useCallback(() => {
    const trimmed = textInput.trim();
    if (!trimmed) return;

    const item: CacheItem = {
      id: crypto.randomUUID(),
      type: 'text',
      content: trimmed,
      addedAt: Date.now(),
    };
    setItems((prev) => [...prev, item]);
    setTextInput('');
  }, [textInput]);

  const addLinkItem = useCallback(() => {
    const trimmed = linkInput.trim();
    if (!trimmed || !isValidURL(trimmed)) {
      setError('Please enter a valid URL (https://...)');
      return;
    }

    const item: CacheItem = {
      id: crypto.randomUUID(),
      type: 'link',
      content: trimmed,
      addedAt: Date.now(),
    };
    setItems((prev) => [...prev, item]);
    setLinkInput('');
    setError(null);
  }, [linkInput]);

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      if (!auth?.currentUser) return;

      setUploading(true);
      setError(null);

      const uid = auth.currentUser.uid;

      for (const file of Array.from(files)) {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          continue;
        }

        try {
          const task = uploadFile('__cache__/' + uid, file, uid);
          if (!task) {
            setError('Upload service unavailable.');
            continue;
          }

          // Wait for upload to complete
          await new Promise<void>((resolve, reject) => {
            task.on(
              'state_changed',
              null,
              (err) => reject(err),
              async () => {
                try {
                  const downloadURL = await getDownloadURL(task.snapshot.ref);
                  const mediaType = deriveMediaType(file.type);

                  const item: CacheItem = {
                    id: crypto.randomUUID(),
                    type: mediaType,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    downloadURL,
                    storagePath: task.snapshot.ref.fullPath,
                    addedAt: Date.now(),
                  };
                  setItems((prev) => [...prev, item]);
                  resolve();
                } catch (err) {
                  reject(err);
                }
              },
            );
          });
        } catch {
          setError(`Failed to upload ${file.name}.`);
        }
      }

      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!profile) return;
    if (!title.trim()) {
      setError('Please enter a title for your cache.');
      return;
    }
    if (items.length === 0) {
      setError('Add at least one item to your cache.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const cacheId = await createCache(
        title.trim(),
        items,
        profile.uid,
        profile.displayName,
      );

      if (cacheId) {
        addToast({ title: 'Cache created!', type: 'success' });
        navigate(`/cache/${cacheId}`);
      } else {
        setError('Failed to create cache. Please try again.');
      }
    } catch {
      setError('Failed to create cache. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [profile, title, items, navigate, addToast]);

  // Auth guards
  if (authLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <p className='text-sm text-foreground/50'>Loading...</p>
      </div>
    );
  }

  if (!user || user.isAnonymous) {
    return (
      <div className='flex flex-col items-center justify-center px-4 py-12'>
        <CachePromotion />
      </div>
    );
  }

  if (needsProfile) {
    return <ProfileSetup />;
  }

  return (
    <div className='mx-auto w-full max-w-md space-y-6 px-4 py-8'>
      <div className='space-y-1'>
        <h1 className='text-2xl font-bold'>Create Cache</h1>
        <p className='text-sm text-foreground/60'>
          Add text, links, and files. Your cache will be available for 7 days.
        </p>
      </div>

      {error && (
        <Callout variant='destructive' icon={null} description={error} />
      )}

      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='Cache title'
        maxLength={100}
        aria-label='Cache title'
      />

      {/* Add items */}
      <div className='space-y-3'>
        <div className='flex gap-2'>
          <Button
            size='sm'
            variant={addMode === 'text' ? 'primary' : 'tertiary'}
            onClick={() => setAddMode('text')}
          >
            <TextIcon className='mr-1 h-4 w-4' />
            Text
          </Button>
          <Button
            size='sm'
            variant={addMode === 'link' ? 'primary' : 'tertiary'}
            onClick={() => setAddMode('link')}
          >
            <LinkIcon className='mr-1 h-4 w-4' />
            Link
          </Button>
          <Button
            size='sm'
            variant={addMode === 'file' ? 'primary' : 'tertiary'}
            onClick={() => setAddMode('file')}
          >
            <FileIcon className='mr-1 h-4 w-4' />
            File
          </Button>
        </div>

        {addMode === 'text' && (
          <div className='space-y-2'>
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder='Type or paste text...'
              rows={3}
              aria-label='Text content'
            />
            <Button
              size='sm'
              variant='secondary'
              onClick={addTextItem}
              disabled={!textInput.trim()}
              className='w-full'
            >
              Add Text
            </Button>
          </div>
        )}

        {addMode === 'link' && (
          <div className='space-y-2'>
            <Input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              placeholder='https://example.com'
              type='url'
              aria-label='Link URL'
            />
            <Button
              size='sm'
              variant='secondary'
              onClick={addLinkItem}
              disabled={!linkInput.trim()}
              className='w-full'
            >
              Add Link
            </Button>
          </div>
        )}

        {addMode === 'file' && (
          <div className='space-y-2'>
            <input
              ref={fileInputRef}
              type='file'
              multiple
              onChange={handleFileSelect}
              className='block w-full text-sm text-foreground/70 file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20'
              aria-label='Select files to upload'
            />
            {uploading && (
              <p className='text-xs text-foreground/50'>Uploading...</p>
            )}
          </div>
        )}
      </div>

      {/* Item list */}
      {items.length > 0 && (
        <div className='space-y-2'>
          <h3 className='text-sm font-medium text-foreground/70'>
            Items ({items.length})
          </h3>
          <div className='space-y-1'>
            {items.map((item) => (
              <div
                key={item.id}
                className='flex items-center gap-2 rounded-lg border border-foreground/10 px-3 py-2'
              >
                {getItemIcon(item)}
                <span className='min-w-0 flex-1 truncate text-sm'>
                  {getItemLabel(item)}
                </span>
                <button
                  onClick={() => removeItem(item.id)}
                  className='shrink-0 rounded p-1 text-foreground/40 hover:bg-foreground/10 hover:text-foreground/70'
                  aria-label='Remove item'
                >
                  <Trash className='h-3.5 w-3.5' />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create button */}
      <Button
        onClick={handleCreate}
        disabled={creating || !title.trim() || items.length === 0}
        className='w-full'
      >
        {creating ? 'Creating...' : 'Create Cache'}
      </Button>

      <Button
        variant='tertiary'
        onClick={() => navigate('/')}
        className='w-full'
      >
        Cancel
      </Button>
    </div>
  );
}

export default CreateCache;

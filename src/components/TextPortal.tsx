import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Textarea,
  Button,
  CopyButton,
  ScrollArea,
} from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';
import { MediaIcon } from '@components/icons/MediaIcon';
import { ref, push, onValue, type Unsubscribe } from 'firebase/database';
import { database } from '@lib/firebase';
import { useSessionContext } from '@hooks/useSessionContext';
import { useMediaUpload, type MediaUploadResult } from '@hooks/useMediaUpload';
import { MAX_FILE_SIZE } from '@lib/firebase/storage';

interface FeedMessage {
  id: string;
  text: string;
  deviceId: string;
  deviceName: string;
  color: string;
  sentAt: number;
  /** When present, this is a media message */
  mediaIds?: string[];
  fileNames?: string[];
  downloadURLs?: string[];
}

interface TextPortalProps {
  className?: string;
}

const ACCEPTED_TYPES = 'image/*,application/pdf';

export function TextPortal({ className }: TextPortalProps) {
  const { session, deviceId, deviceName, deviceColor } = useSessionContext();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { uploadMedia, uploading, progress } = useMediaUpload();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadIndex, setUploadIndex] = useState({ current: 0, total: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionPin = session?.pin;

  // Subscribe to messages from RTDB
  useEffect(() => {
    if (!database || !sessionPin) return;

    const messagesRef = ref(database, `sessions/${sessionPin}/messages`);

    const unsubscribe: Unsubscribe = onValue(messagesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMessages([]);
        return;
      }

      const raw = snapshot.val() as Record<string, Omit<FeedMessage, 'id'>>;
      const sorted = Object.entries(raw)
        .map(([key, value]) => ({ id: key, ...value }))
        .sort((a, b) => a.sentAt - b.sentAt);

      setMessages(sorted);
    });

    return () => unsubscribe();
  }, [sessionPin]);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !database || !sessionPin || !deviceId) return;

    setSending(true);
    try {
      const messagesRef = ref(database, `sessions/${sessionPin}/messages`);
      await push(messagesRef, {
        text,
        deviceId,
        deviceName,
        color: deviceColor,
        sentAt: Date.now(),
      });
      setDraft('');
    } catch {
      addToast({ title: 'Failed to send message', type: 'error' });
    } finally {
      setSending(false);
    }
  }, [draft, sessionPin, deviceId, deviceName, deviceColor, addToast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !database || !sessionPin || !deviceId)
        return;

      // Clone file list before resetting – e.target.files is a live reference
      const selectedFiles = Array.from(files);

      // Reset input so the same file can be selected again
      e.target.value = '';

      // Quick client-side size check
      const validFiles: File[] = [];
      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          addToast({
            title: `${file.name} is too large (max 10MB)`,
            type: 'error',
          });
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length === 0) return;

      // Upload each file and collect results
      const results: MediaUploadResult[] = [];
      setUploadIndex({ current: 0, total: validFiles.length });
      for (let i = 0; i < validFiles.length; i++) {
        setUploadIndex({ current: i + 1, total: validFiles.length });
        const result = await uploadMedia(validFiles[i]);
        if (result) results.push(result);
      }
      if (results.length === 0) return;

      const mediaIds = results.map((r) => r.id);
      const fileNames = validFiles
        .slice(0, results.length)
        .map((f) => f.name);
      const downloadURLs = results.map((r) => r.downloadURL);

      // Build summary text
      const imageCount = validFiles.filter((f) =>
        f.type.startsWith('image/'),
      ).length;
      const pdfCount = validFiles.filter(
        (f) => f.type === 'application/pdf',
      ).length;
      const parts: string[] = [];
      if (imageCount > 0) {
        parts.push(`${imageCount} ${imageCount === 1 ? 'image' : 'images'}`);
      }
      if (pdfCount > 0) {
        parts.push(`${pdfCount} ${pdfCount === 1 ? 'PDF' : 'PDFs'}`);
      }
      const summaryText = `Shared ${parts.join(' and ')}`;

      // Post a feed message
      try {
        const messagesRef = ref(database, `sessions/${sessionPin}/messages`);
        await push(messagesRef, {
          text: summaryText,
          deviceId,
          deviceName,
          color: deviceColor,
          sentAt: Date.now(),
          mediaIds,
          fileNames,
          downloadURLs,
        });
      } catch {
        addToast({ title: 'Failed to post media message', type: 'error' });
      }
    },
    [sessionPin, deviceId, deviceName, deviceColor, addToast, uploadMedia],
  );

  if (!session) return null;

  return (
    <div className={join('flex min-h-0 flex-1 flex-col', className)}>
      {/* Message feed */}
      {messages.length === 0 ? (
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-foreground/40 text-sm'>
            No messages yet — send the first one!
          </p>
        </div>
      ) : (
        <ScrollArea className='border-foreground/10 min-h-0 flex-1 overflow-y-auto rounded-md border'>
          <div className='space-y-3 p-3'>
            {messages.map((msg) => (
              <div key={msg.id} className='flex flex-col gap-1'>
                {/* Sender badge + timestamp */}
                <div className='flex items-center gap-1.5'>
                  <span
                    className='inline-block h-2 w-2 shrink-0 rounded-full'
                    style={{ backgroundColor: msg.color }}
                  />
                  <span
                    className='text-xs font-semibold'
                    style={{ color: msg.color }}
                  >
                    {msg.deviceName}
                  </span>
                  <span className='text-foreground/30 text-xs'>
                    {new Date(msg.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                {/* Message content */}
                <div className='flex items-start gap-2 pl-3.5'>
                  {msg.mediaIds ? (
                    <div className='flex-1 text-sm'>
                      {msg.mediaIds.length === 1 ? (
                        <a
                          href={msg.downloadURLs?.[0] ?? '#'}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary underline-offset-2 hover:underline'
                        >
                          <MediaIcon className='h-4 w-4 align-text-bottom' /> {msg.text} {msg.fileNames?.[0] ? `(${msg.fileNames?.[0]})` : ''}
                        </a>
                      ) : (
                        <>
                          <button
                            onClick={() => navigate('/media')}
                            className='text-left'
                          >
                            <MediaIcon className='h-4 w-4 align-text-bottom' />{' '}
                            <span className='text-primary underline-offset-2 hover:underline'>
                              {msg.text} — View all media
                            </span>
                          </button>
                          {msg.fileNames && msg.fileNames.length > 0 && (
                            <ul className='text-foreground/50 mt-1 list-inside list-disc text-xs'>
                              {msg.fileNames.map((name, i) => (
                                <li key={i}>
                                  <a
                                    href={msg.downloadURLs?.[i] ?? '#'}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='text-primary/70 underline-offset-2 hover:underline'
                                  >
                                    {name}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className='flex-1 text-sm wrap-break-word'>
                        {msg.text}
                      </p>
                      <CopyButton
                        textToCopy={msg.text}
                        size='icon'
                        variant='tertiary'
                        iconSize={12}
                      />
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className='shrink-0 px-1 pt-2'>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-foreground/60'>
              Uploading{uploadIndex.total > 1 ? ` ${uploadIndex.current}/${uploadIndex.total}` : ''}…
            </span>
            <span className='text-foreground/80 font-mono'>{progress}%</span>
          </div>
          <div className='bg-foreground/10 mt-1 h-1.5 w-full overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Compose area — always at the bottom */}
      <div className='border-foreground/10 shrink-0 space-y-2 border-t pt-3 pb-4'>
        {/* Device identity indicator */}
        <div className='flex items-center gap-1.5'>
          <span
            className='inline-block h-2 w-2 rounded-full'
            style={{ backgroundColor: deviceColor }}
          />
          <span className='text-xs font-medium' style={{ color: deviceColor }}>
            {deviceName}
          </span>
        </div>

        <Textarea
          autoExpand
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type a message…'
          rows={2}
          className='max-h-32'
        />

        <div className='flex items-center justify-between'>
          {/* Attach file button */}
          <Button
            size='sm'
            variant='tertiary'
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <MediaIcon className='mr-1 h-4 w-4' />
            Media
          </Button>
          <input
            ref={fileInputRef}
            type='file'
            accept={ACCEPTED_TYPES}
            multiple
            onChange={handleFileSelect}
            className='hidden'
          />

          <Button
            onClick={handleSend}
            disabled={!draft.trim() || sending || !deviceId}
            size='sm'
          >
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}

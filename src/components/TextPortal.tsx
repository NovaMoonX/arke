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
  Input,
  Button,
  CopyButton,
  ScrollArea,
  Toggle,
} from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';
import { TextIcon } from '@components/icons/TextIcon';
import { LinkIcon } from '@components/icons/LinkIcon';
import { ImageIcon } from '@components/icons/ImageIcon';
import { VideoIcon } from '@components/icons/VideoIcon';
import { FileIcon } from '@components/icons/FileIcon';
import { ref, push, onValue, type Unsubscribe } from 'firebase/database';
import { database } from '@lib/firebase';
import { useSessionContext } from '@hooks/useSessionContext';
import { useMediaUpload, type MediaUploadResult } from '@hooks/useMediaUpload';
import { MAX_FILE_SIZE, MAX_VIDEO_SIZE, saveLinkMetadata } from '@lib/firebase/storage';
import { auth } from '@lib/firebase';

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
  /** Type of shared content for icon display */
  contentType?: 'text' | 'link' | 'image' | 'video' | 'file' | 'mixed';
}

type InputMode = 'text' | 'link' | 'media' | 'file';

interface TextPortalProps {
  className?: string;
}

const MEDIA_ACCEPTED_TYPES = 'image/*,video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,audio/*';
const FILE_ACCEPTED_TYPES = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/zip,application/x-zip-compressed,application/gzip,application/x-tar,application/x-7z-compressed,application/x-rar-compressed,text/plain,text/csv,text/html,text/markdown,application/json,application/xml';

const AUTO_OPEN_KEY = 'arke_auto_open';

function getAutoOpenDefault(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_OPEN_KEY);
    if (stored !== null) return stored === 'true';
    // Migrate from old key
    const old = localStorage.getItem('arke_auto_download');
    if (old !== null) {
      localStorage.removeItem('arke_auto_download');
      localStorage.setItem(AUTO_OPEN_KEY, old);
      return old === 'true';
    }
  } catch {
    // ignore
  }
  return true;
}

function getContentTypeIcon(contentType?: string) {
  switch (contentType) {
    case 'link':
      return <LinkIcon className='h-4 w-4 align-text-bottom' />;
    case 'image':
      return <ImageIcon className='h-4 w-4 align-text-bottom' />;
    case 'video':
      return <VideoIcon className='h-4 w-4 align-text-bottom' />;
    case 'file':
      return <FileIcon className='h-4 w-4 align-text-bottom' />;
    default:
      return <TextIcon className='h-4 w-4 align-text-bottom' />;
  }
}

export function TextPortal({ className }: TextPortalProps) {
  const { session, deviceId, deviceName, deviceColor } = useSessionContext();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { uploadMedia, uploading, progress } = useMediaUpload();
  const [draft, setDraft] = useState('');
  const [linkDraft, setLinkDraft] = useState('');
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadIndex, setUploadIndex] = useState({ current: 0, total: 0 });
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [autoOpen, setAutoOpen] = useState(getAutoOpenDefault);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionPin = session?.pin;

  // Persist auto-open preference
  useEffect(() => {
    try {
      localStorage.setItem(AUTO_OPEN_KEY, String(autoOpen));
    } catch {
      // ignore
    }
  }, [autoOpen]);

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

  // Auto-open new incoming messages that have a URL to open
  useEffect(() => {
    if (!autoOpen || messages.length === 0) return;

    const latestMsg = messages[messages.length - 1];
    // Skip own messages
    if (latestMsg.deviceId === deviceId) return;

    const hasURLs = latestMsg.downloadURLs && latestMsg.downloadURLs.length > 0;
    const isOpenable =
      latestMsg.contentType === 'link' ||
      latestMsg.contentType === 'image' ||
      latestMsg.contentType === 'video' ||
      latestMsg.contentType === 'file' ||
      latestMsg.contentType === 'mixed';

    if (!isOpenable || !hasURLs) return;

    // Only auto-open if the message is recent (within 5 seconds)
    const isRecent = Date.now() - latestMsg.sentAt < 5000;
    if (isRecent) {
      for (const url of latestMsg.downloadURLs ?? []) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    }
  }, [messages, autoOpen, deviceId]);

  const handleSendText = useCallback(async () => {
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
        contentType: 'text',
      });
      setDraft('');
    } catch {
      addToast({ title: 'Failed to send message', type: 'error' });
    } finally {
      setSending(false);
    }
  }, [draft, sessionPin, deviceId, deviceName, deviceColor, addToast]);

  const handleSendLink = useCallback(async () => {
    const url = linkDraft.trim();
    if (!url || !database || !sessionPin || !deviceId) return;

    // Basic URL validation
    let finalUrl = url;
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    try {
      new URL(finalUrl);
    } catch {
      addToast({ title: 'Please enter a valid URL', type: 'error' });
      return;
    }

    setSending(true);
    try {
      const userId = auth?.currentUser?.uid;
      if (!userId) throw new Error('Not authenticated');

      // Save link to media collection
      const linkId = await saveLinkMetadata(sessionPin, finalUrl, userId);

      const messagesRef = ref(database, `sessions/${sessionPin}/messages`);
      await push(messagesRef, {
        text: `Shared a link`,
        deviceId,
        deviceName,
        color: deviceColor,
        sentAt: Date.now(),
        contentType: 'link',
        mediaIds: linkId ? [linkId] : [],
        downloadURLs: [finalUrl],
        fileNames: [finalUrl],
      });
      setLinkDraft('');
    } catch {
      addToast({ title: 'Failed to share link', type: 'error' });
    } finally {
      setSending(false);
    }
  }, [linkDraft, sessionPin, deviceId, deviceName, deviceColor, addToast]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  const handleLinkKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSendLink();
      }
    },
    [handleSendLink],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, mode: 'media' | 'file') => {
      const files = e.target.files;
      if (!files || files.length === 0 || !database || !sessionPin || !deviceId)
        return;

      const selectedFiles = Array.from(files);
      e.target.value = '';

      // Quick client-side size check
      const validFiles: File[] = [];
      for (const file of selectedFiles) {
        const isLargeMedia = file.type.startsWith('video/') || file.type.startsWith('audio/');
        const maxSize = isLargeMedia ? MAX_VIDEO_SIZE : MAX_FILE_SIZE;
        const limitMB = maxSize / (1024 * 1024);
        if (file.size > maxSize) {
          addToast({
            title: `${file.name} is too large (max ${limitMB}MB)`,
            type: 'error',
          });
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length === 0) return;

      // Upload each file — track file+result pairs together
      const pairs: { file: File; result: MediaUploadResult }[] = [];
      setUploadIndex({ current: 0, total: validFiles.length });
      for (let i = 0; i < validFiles.length; i++) {
        setUploadIndex({ current: i + 1, total: validFiles.length });
        const result = await uploadMedia(validFiles[i]);
        if (result) {
          pairs.push({ file: validFiles[i], result });
        } else {
          // Surface the per-file failure to the user
          addToast({
            title: `Failed to upload ${validFiles[i].name}`,
            type: 'error',
          });
        }
      }
      if (pairs.length === 0) return;

      const mediaIds = pairs.map((p) => p.result.id);
      const fileNames = pairs.map((p) => p.file.name);
      const downloadURLs = pairs.map((p) => p.result.downloadURL);

      // Build summary text and content type from SUCCESSFUL uploads only
      const imageCount = pairs.filter((p) =>
        p.file.type.startsWith('image/'),
      ).length;
      const videoCount = pairs.filter((p) =>
        p.file.type.startsWith('video/'),
      ).length;
      const audioCount = pairs.filter((p) =>
        p.file.type.startsWith('audio/'),
      ).length;
      const fileCount = pairs.filter(
        (p) => !p.file.type.startsWith('image/') && !p.file.type.startsWith('video/') && !p.file.type.startsWith('audio/'),
      ).length;

      const parts: string[] = [];
      if (imageCount > 0) {
        parts.push(`${imageCount} ${imageCount === 1 ? 'image' : 'images'}`);
      }
      if (videoCount > 0) {
        parts.push(`${videoCount} ${videoCount === 1 ? 'video' : 'videos'}`);
      }
      if (audioCount > 0) {
        parts.push(`${audioCount} ${audioCount === 1 ? 'audio file' : 'audio files'}`);
      }
      if (fileCount > 0) {
        parts.push(`${fileCount} ${fileCount === 1 ? 'file' : 'files'}`);
      }
      const summaryText = `Shared ${parts.join(' and ')}`;

      // Determine content type for the icon
      let contentType: FeedMessage['contentType'] = 'file';
      if (mode === 'media') {
        const mediaTypeCount = (imageCount > 0 ? 1 : 0) + (videoCount > 0 ? 1 : 0) + (audioCount > 0 ? 1 : 0);
        if (mediaTypeCount > 1) contentType = 'mixed';
        else if (imageCount > 0) contentType = 'image';
        else if (videoCount > 0) contentType = 'video';
        else if (audioCount > 0) contentType = 'mixed';
      }

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
          contentType,
        });
      } catch {
        addToast({ title: 'Failed to post media message', type: 'error' });
      }
    },
    [sessionPin, deviceId, deviceName, deviceColor, addToast, uploadMedia],
  );

  if (!session) return null;

  const inputModes: { mode: InputMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'text', label: 'Text', icon: <TextIcon className='h-3.5 w-3.5' /> },
    { mode: 'link', label: 'Link', icon: <LinkIcon className='h-3.5 w-3.5' /> },
    { mode: 'media', label: 'Media', icon: <ImageIcon className='h-3.5 w-3.5' /> },
    { mode: 'file', label: 'File', icon: <FileIcon className='h-3.5 w-3.5' /> },
  ];

  return (
    <div className={join('flex min-h-0 flex-1 flex-col', className)} role='region' aria-label='Message portal'>
      {/* Message feed */}
      {messages.length === 0 ? (
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-foreground/40 text-sm'>
            No messages yet — send the first one!
          </p>
        </div>
      ) : (
        <ScrollArea className='border-foreground/10 min-h-0 flex-1 overflow-y-auto rounded-md border' aria-label='Message feed'>
          <div className='space-y-3 p-3' role='log' aria-live='polite'>
            {messages.map((msg) => (
              <div key={msg.id} className='flex flex-col gap-1'>
                {/* Sender badge + timestamp */}
                <div className='flex items-center gap-1.5'>
                  <span
                    className='inline-block h-2 w-2 shrink-0 rounded-full'
                    style={{ backgroundColor: msg.color }}
                    aria-hidden='true'
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
                  {msg.contentType === 'link' && msg.downloadURLs?.[0] ? (
                    <div className='flex flex-1 items-start gap-2 text-sm'>
                      <a
                        href={msg.downloadURLs[0]}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-primary min-w-0 flex-1 underline-offset-2 hover:underline'
                        aria-label={`Open shared link: ${msg.downloadURLs[0]}`}
                      >
                        {getContentTypeIcon('link')}{' '}
                        <span className='break-all'>{msg.downloadURLs[0]}</span>
                      </a>
                      <CopyButton
                        textToCopy={msg.downloadURLs[0]}
                        size='icon'
                        variant='tertiary'
                        iconSize={12}
                      />
                    </div>
                  ) : msg.mediaIds ? (
                    <div className='min-w-0 flex-1 text-sm'>
                      {msg.mediaIds.length === 1 ? (
                        <a
                          href={msg.downloadURLs?.[0] ?? '#'}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-primary underline-offset-2 hover:underline'
                          aria-label={`Open shared file: ${msg.fileNames?.[0] ?? 'media'}`}
                        >
                          {getContentTypeIcon(msg.contentType)} {msg.text}{' '}
                          {msg.fileNames?.[0] && (
                            <span className='break-all'>({msg.fileNames[0]})</span>
                          )}
                        </a>
                      ) : (
                        <>
                          <button
                            onClick={() => navigate('/media')}
                            className='text-left'
                            aria-label='View all shared items'
                          >
                            {getContentTypeIcon(msg.contentType)}{' '}
                            <span className='text-primary underline-offset-2 hover:underline'>
                              {msg.text} — View all shared items
                            </span>
                          </button>
                          {msg.fileNames && msg.fileNames.length > 0 && (
                            <ul className='text-foreground/50 mt-1 list-inside list-disc text-xs'>
                              {msg.fileNames.map((name, i) => (
                                <li key={i} className='break-all'>
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
        <div className='shrink-0 px-1 pt-2' role='status' aria-label='File upload progress'>
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
              role='progressbar'
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Compose area — always at the bottom */}
      <div className='border-foreground/10 shrink-0 space-y-2 border-t pt-3 pb-4'>
        {/* Auto-download toggle */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1.5'>
            <span
              className='inline-block h-2 w-2 rounded-full'
              style={{ backgroundColor: deviceColor }}
              aria-hidden='true'
            />
            <span className='text-xs font-medium' style={{ color: deviceColor }}>
              {deviceName}
            </span>
          </div>
          <div className='flex items-center gap-1.5'>
            <span className='text-foreground/50 text-xs'>Auto-open</span>
            <Toggle
              checked={autoOpen}
              onCheckedChange={setAutoOpen}
              size='sm'
              aria-label='Toggle auto-open of shared items'
            />
          </div>
        </div>

        {/* Input mode selector */}
        <div className='flex gap-1' role='tablist' aria-label='Input type'>
          {inputModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              role='tab'
              aria-selected={inputMode === mode}
              onClick={() => setInputMode(mode)}
              className={join(
                'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                inputMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground/5 text-foreground/60 hover:bg-foreground/10',
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Text input */}
        {inputMode === 'text' && (
          <>
            <Textarea
              autoExpand
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Type a message…'
              rows={2}
              className='max-h-32'
              aria-label='Message input'
            />
            <div className='flex justify-end'>
              <Button
                onClick={handleSendText}
                disabled={!draft.trim() || sending || !deviceId}
                size='sm'
                aria-label='Send message'
              >
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </>
        )}

        {/* Link input */}
        {inputMode === 'link' && (
          <>
            <Input
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              onKeyDown={handleLinkKeyDown}
              placeholder='Paste or type a URL…'
              aria-label='Link input'
            />
            <div className='flex justify-end'>
              <Button
                onClick={handleSendLink}
                disabled={!linkDraft.trim() || sending || !deviceId}
                size='sm'
                aria-label='Share link'
              >
                {sending ? 'Sharing…' : 'Share Link'}
              </Button>
            </div>
          </>
        )}

        {/* Media input (images + videos) */}
        {inputMode === 'media' && (
          <>
            <Button
              variant='secondary'
              className='w-full'
              onClick={() => mediaInputRef.current?.click()}
              disabled={uploading}
              aria-label='Select images or videos to share'
            >
              <ImageIcon className='mr-1.5 h-4 w-4' />
              Select Images, Videos, or Audio
            </Button>
            <p className='text-foreground/40 text-center text-xs'>
              Images up to 10MB · Videos up to 50MB · Audio up to 50MB
            </p>
            <input
              ref={mediaInputRef}
              type='file'
              accept={MEDIA_ACCEPTED_TYPES}
              multiple
              onChange={(e) => handleFileSelect(e, 'media')}
              className='hidden'
              aria-hidden='true'
            />
          </>
        )}

        {/* File input */}
        {inputMode === 'file' && (
          <>
            <Button
              variant='secondary'
              className='w-full'
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label='Select files to share'
            >
              <FileIcon className='mr-1.5 h-4 w-4' />
              Select Files
            </Button>
            <p className='text-foreground/40 text-center text-xs'>
              Documents and archives up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type='file'
              accept={FILE_ACCEPTED_TYPES}
              multiple
              onChange={(e) => handleFileSelect(e, 'file')}
              className='hidden'
              aria-hidden='true'
            />
          </>
        )}
      </div>
    </div>
  );
}

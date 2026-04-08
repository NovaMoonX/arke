import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from 'react';
import { Textarea, Button, CopyButton, ScrollArea } from '@moondreamsdev/dreamer-ui/components';
import { join } from '@moondreamsdev/dreamer-ui/utils';
import { useToast } from '@moondreamsdev/dreamer-ui/hooks';
import { ref, push, onValue, type Unsubscribe } from 'firebase/database';
import { database } from '@lib/firebase';
import { useSessionContext } from '@hooks/useSessionContext';

interface TextMessage {
  id: string;
  text: string;
  deviceId: string;
  deviceName: string;
  color: string;
  sentAt: number;
}

interface TextPortalProps {
  className?: string;
}

export function TextPortal({ className }: TextPortalProps) {
  const { session, deviceId, deviceName, deviceColor } = useSessionContext();
  const { addToast } = useToast();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<TextMessage[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      const raw = snapshot.val() as Record<string, Omit<TextMessage, 'id'>>;
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

  if (!session) return null;

  return (
    <div className={join('flex min-h-0 flex-col', className)}>
      {/* Message feed */}
      {messages.length === 0 ? (
        <div className='flex flex-1 items-center justify-center'>
          <p className='text-sm text-foreground/40'>
            No messages yet — send the first one!
          </p>
        </div>
      ) : (
        <ScrollArea className='flex-1 rounded-md border border-foreground/10'>
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
                  <span className='text-xs text-foreground/30'>
                    {new Date(msg.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                {/* Message text + copy button */}
                <div className='flex items-start gap-2 pl-3.5'>
                  <p className='flex-1 break-words text-sm'>{msg.text}</p>
                  <CopyButton
                    textToCopy={msg.text}
                    size='icon'
                    variant='tertiary'
                    iconSize={12}
                  />
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      )}

      {/* Compose area — always at the bottom */}
      <div className='shrink-0 space-y-2 border-t border-foreground/10 pt-3 pb-4'>
        {/* Device identity indicator */}
        <div className='flex items-center gap-1.5'>
          <span
            className='inline-block h-2 w-2 rounded-full'
            style={{ backgroundColor: deviceColor }}
          />
          <span
            className='text-xs font-medium'
            style={{ color: deviceColor }}
          >
            {deviceName}
          </span>
        </div>

        <Textarea
          autoExpand
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type text to send…'
          rows={3}
        />

        <div className='flex items-center justify-between'>
          <span className='hidden text-xs text-foreground/40 md:inline'>
            Ctrl+Enter to send
          </span>
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


import { useState, useCallback } from 'react';
import { Button, Modal } from '@moondreamsdev/dreamer-ui/components';
import { ChevronRight, ChevronLeft } from '@moondreamsdev/dreamer-ui/symbols';
import { join } from '@moondreamsdev/dreamer-ui/utils';

const STORAGE_KEY = 'arke_onboarding_complete';

interface Step {
  title: string;
  description: string;
  emoji: string;
}

const STEPS: Step[] = [
  {
    title: 'Create or Join a Session',
    description:
      'Tap "Start Sharing" to create a session, or enter a 6-digit PIN to join an existing one. Share the PIN or QR code with other devices.',
    emoji: '🔗',
  },
  {
    title: 'Send Text & Media',
    description:
      'Type messages, paste clipboard content, or attach images and PDFs. Everything syncs in real-time across all connected devices.',
    emoji: '📤',
  },
  {
    title: 'Secure & Ephemeral',
    description:
      'Sessions automatically expire after 1 hour. No accounts needed — your data stays private and is never stored permanently.',
    emoji: '🔒',
  },
];

/**
 * A 3-step onboarding modal shown to first-time users.
 * Completion is persisted in localStorage.
 */
export function OnboardingFlow() {
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  }, []);

  const next = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!show) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      isOpen={show}
      onClose={dismiss}
      title='Welcome to Arke'
      ariaLabelledBy='onboarding-title'
    >
      <div className='space-y-6 px-4 pb-4 pt-2'>
        {/* Step content */}
        <div className='text-center'>
          <span className='text-5xl' role='img' aria-label={current.title}>
            {current.emoji}
          </span>
          <h3 className='mt-3 text-lg font-semibold'>{current.title}</h3>
          <p className='mt-1 text-sm text-foreground/60'>
            {current.description}
          </p>
        </div>

        {/* Step dots */}
        <div
          className='flex items-center justify-center gap-2'
          role='tablist'
          aria-label='Onboarding steps'
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              role='tab'
              aria-selected={i === step}
              aria-label={`Step ${i + 1}`}
              className={join(
                'h-2 w-2 rounded-full transition-colors',
                i === step ? 'bg-primary' : 'bg-foreground/20',
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className='flex items-center justify-between gap-2'>
          <Button
            variant='tertiary'
            size='sm'
            onClick={dismiss}
            aria-label='Skip onboarding'
          >
            Skip
          </Button>

          <div className='flex gap-2'>
            {step > 0 && (
              <Button
                variant='secondary'
                size='sm'
                onClick={prev}
                aria-label='Previous step'
              >
                <ChevronLeft className='mr-1 h-4 w-4' />
                Back
              </Button>
            )}
            <Button size='sm' onClick={next} aria-label={isLast ? 'Finish onboarding' : 'Next step'}>
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ChevronRight className='ml-1 h-4 w-4' />}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

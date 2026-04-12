import { APP_TITLE, APP_DESCRIPTION } from '@lib/app';
import { SessionManager } from '@components/SessionManager';
import { TextPortal } from '@components/TextPortal';
import { MediaSummary } from '@components/MediaSummary';
import { OnboardingFlow } from '@components/OnboardingFlow';
import { CachePromotion } from '@components/CachePromotion';
import { useSessionContext } from '@hooks/useSessionContext';
import { useAuth } from '@hooks/useAuth';
import { CopyButton, Button } from '@moondreamsdev/dreamer-ui/components';
import { useNavigate } from 'react-router-dom';

function Home() {
	const { session } = useSessionContext();
	const { user } = useAuth();
	const navigate = useNavigate();

	const isSignedIn = !!user && !user.isAnonymous;

	if (session) {
		return (
			<div className='flex h-dvh w-dvw flex-col overflow-hidden'>
				<div className='mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-4'>
					<div className='shrink-0 pb-4 pt-6 text-center'>
					<div className='inline-flex items-center gap-2'>
						<h1 className='font-mono text-xl font-bold tracking-widest text-foreground/70'>
							{session.pin}
						</h1>
						<CopyButton
							textToCopy={session.pin}
							size='icon'
							variant='tertiary'
							iconSize={16}
						/>
					</div>
					</div>
					<div className='shrink-0 pb-2'>
						<SessionManager />
					</div>
					<div className='shrink-0 pb-2'>
						<MediaSummary />
					</div>
					<TextPortal className='flex-1' />
				</div>
			</div>
		);
	}

	return (
		<div className='page flex flex-col items-center justify-center overflow-x-hidden'>
			<div className='w-full max-w-md space-y-8 px-4 py-12 text-center'>
				<div className='space-y-2'>
					<h1 className='text-5xl font-bold md:text-6xl'>{APP_TITLE}</h1>
					{APP_DESCRIPTION && (
						<p className='text-lg text-foreground/80 md:text-xl'>
							{APP_DESCRIPTION}
						</p>
					)}
				</div>
				<SessionManager />

				{/* Cache section */}
				<div className='pt-4'>
					<div className='flex items-center gap-3 pb-4' aria-hidden='true'>
						<div className='h-px flex-1 bg-foreground/10' />
						<span className='text-sm text-foreground/40'>cache</span>
						<div className='h-px flex-1 bg-foreground/10' />
					</div>

					{isSignedIn ? (
						<div className='space-y-3'>
							<p className='text-sm text-foreground/60'>
								Upload and share text, links, and files that last 7 days.
							</p>
							<div className='flex gap-2'>
								<Button
									onClick={() => navigate('/cache/new')}
									className='flex-1'
								>
									+ New Cache
								</Button>
								<Button
									variant='secondary'
									onClick={() => navigate('/cache')}
									className='flex-1'
								>
									My Caches
								</Button>
							</div>
						</div>
					) : (
						<CachePromotion />
					)}
				</div>
			</div>
			<OnboardingFlow />
		</div>
	);
}

export default Home;

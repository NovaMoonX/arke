import { APP_TITLE, APP_DESCRIPTION } from '@lib/app';
import { SessionManager } from '@components/SessionManager';
import { TextPortal } from '@components/TextPortal';
import { useSessionContext } from '@hooks/useSessionContext';

function Home() {
	const { session } = useSessionContext();

	if (session) {
		return (
			<div className='page flex flex-col overflow-x-hidden'>
				<div className='mx-auto flex w-full max-w-md flex-1 flex-col overflow-hidden px-4'>
					<div className='shrink-0 space-y-2 pb-6 pt-12 text-center'>
						<h1 className='text-5xl font-bold md:text-6xl'>{APP_TITLE}</h1>
						{APP_DESCRIPTION && (
							<p className='text-lg text-foreground/80 md:text-xl'>
								{APP_DESCRIPTION}
							</p>
						)}
					</div>
					<div className='shrink-0 pb-4'>
						<SessionManager />
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
			</div>
		</div>
	);
}

export default Home;

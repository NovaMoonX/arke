import { APP_TITLE, APP_DESCRIPTION } from '@lib/app';
import { SessionManager } from '@components/SessionManager';
import { MediaPicker } from '@components/MediaPicker';
import { MediaGallery } from '@components/MediaGallery';
import { useSessionContext } from '@hooks/useSessionContext';

function Home() {
	const { session } = useSessionContext();

	return (
		<div className='page flex flex-col items-center justify-center'>
			<div className='w-full max-w-md space-y-8 px-4 text-center'>
				<div className='space-y-2'>
					<h1 className='text-5xl font-bold md:text-6xl'>{APP_TITLE}</h1>
					{APP_DESCRIPTION && (
						<p className='text-lg text-foreground/80 md:text-xl'>
							{APP_DESCRIPTION}
						</p>
					)}
				</div>
				<SessionManager />
				{session && (
					<>
						<MediaPicker />
						<MediaGallery />
					</>
				)}
			</div>
		</div>
	);
}

export default Home;

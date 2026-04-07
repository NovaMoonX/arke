import { useCallback } from 'react';
import { set, ref } from 'firebase/database';
import { APP_TITLE, APP_DESCRIPTION } from '@lib/app';
import { database } from '@lib/firebase';
import { SessionManager } from '@components/SessionManager';
import { TextPortal } from '@components/TextPortal';
import { TextHistory } from '@components/TextHistory';
import { useSessionContext } from '@hooks/useSessionContext';

function Home() {
	const { session } = useSessionContext();

	const handleRestore = useCallback(
		async (text: string) => {
			if (!session || !database) return;
			const textRef = ref(database, `sessions/${session.pin}/text`);
			await set(textRef, text);
		},
		[session],
	);

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
					<div className='space-y-6 text-left'>
						<TextPortal sessionPin={session.pin} />
						<TextHistory
							sessionPin={session.pin}
							onRestore={handleRestore}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export default Home;

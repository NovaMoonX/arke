import { Outlet } from 'react-router-dom';
import ThemeToggle from '@ui/ThemeToggle';
import { NetworkBanner } from '@components/NetworkBanner';
import { APP_TITLE, APP_ICON_PATH } from '@lib/app';

function Layout() {
	return (
		<div className='flex h-dvh w-dvw flex-col transition-colors duration-200'>
			<NetworkBanner />
			<div className='page relative flex-1 overflow-auto'>
				{/* App branding — top right */}
				<div className='absolute top-4 right-4 z-50 flex items-center gap-2'>
					<span className='text-sm font-bold text-foreground/80'>{APP_TITLE}</span>
					<img src={APP_ICON_PATH} alt={APP_TITLE} className='h-7 w-7' />
				</div>
				<main>
					<Outlet />
				</main>
			</div>
			<ThemeToggle />
		</div>
	);
}

export default Layout;

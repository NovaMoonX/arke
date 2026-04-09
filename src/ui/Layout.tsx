import { Outlet } from 'react-router-dom';
import ThemeToggle from '@ui/ThemeToggle';
import { NetworkBanner } from '@components/NetworkBanner';

function Layout() {
	return (
		<div className='flex h-dvh w-dvw flex-col transition-colors duration-200'>
			<NetworkBanner />
			<div className='page relative flex-1 overflow-auto'>
				<ThemeToggle />
				<main>
					<Outlet />
				</main>
			</div>
		</div>
	);
}

export default Layout;

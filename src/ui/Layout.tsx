import { Outlet } from 'react-router-dom';
import ThemeToggle from '@ui/ThemeToggle';

function Layout() {
	return (
		<div className='page transition-colors duration-200'>
			<ThemeToggle />
			<main>
				<Outlet />
			</main>
		</div>
	);
}

export default Layout;

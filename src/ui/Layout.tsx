import { Outlet, useNavigate } from 'react-router-dom';
import { Popover, Button } from '@moondreamsdev/dreamer-ui/components';
import ThemeToggle from '@ui/ThemeToggle';
import { NetworkBanner } from '@components/NetworkBanner';
import { APP_TITLE, APP_ICON_PATH } from '@lib/app';
import { useAuth } from '@hooks/useAuth';

const MENU_ITEM_CLASS =
	'block w-full rounded-md px-2 py-1 text-left text-xs text-foreground/70 hover:bg-foreground/5';

function UserMenu() {
	const { user, profile, signInWithGoogle, signOutUser, loading } =
		useAuth();
	const navigate = useNavigate();

	const isSignedIn = !!user && !user.isAnonymous;

	if (!isSignedIn) {
		return (
			<Button
				size='sm'
				variant='tertiary'
				onClick={signInWithGoogle}
				disabled={loading}
				className='text-xs'
			>
				Sign In
			</Button>
		);
	}

	const initial = (profile?.displayName || user?.email || '?')[0].toUpperCase();

	return (
		<Popover
			trigger={
				<button
					className='flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary'
					aria-label='User menu'
				>
					{user?.photoURL ? (
						<img
							src={user.photoURL}
							alt=''
							className='h-7 w-7 rounded-full'
							referrerPolicy='no-referrer'
						/>
					) : (
						initial
					)}
				</button>
			}
			placement='bottom'
			alignment='end'
			className='max-w-56'
		>
			<div className='space-y-2 p-3'>
				<p className='truncate text-sm font-medium'>
					{profile?.displayName || 'User'}
				</p>
				<p className='truncate text-xs text-foreground/50'>
					{user?.email}
				</p>
				<div className='space-y-1 pt-1'>
					<button
						onClick={() => navigate('/cache')}
						className={MENU_ITEM_CLASS}
					>
						My Caches
					</button>
					<button
						onClick={signOutUser}
						className={MENU_ITEM_CLASS}
					>
						Sign Out
					</button>
				</div>
			</div>
		</Popover>
	);
}

function Layout() {
	return (
		<div className='flex h-dvh w-dvw flex-col transition-colors duration-200'>
			<NetworkBanner />
			<div className='page relative flex-1 overflow-auto'>
				{/* App branding — top right */}
				<div className='absolute top-4 right-4 z-50 flex items-center gap-2'>
					<UserMenu />
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

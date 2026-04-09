import { useTheme } from '@moondreamsdev/dreamer-ui/hooks';
import { Toggle } from '@moondreamsdev/dreamer-ui/components';
import { Moon, Sun } from '@moondreamsdev/dreamer-ui/symbols';

function ThemeToggle() {
	const { toggleTheme, theme } = useTheme();
	const isDark = theme === 'dark';

	return (
		<div className='fixed bottom-4 left-4 z-50 flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-1 shadow-md backdrop-blur-sm'>
			<Sun className='h-3.5 w-3.5 text-foreground/60' />
			<Toggle
				checked={isDark}
				onCheckedChange={toggleTheme}
				size='sm'
				aria-label='Toggle dark mode'
			/>
			<Moon className='h-3.5 w-3.5 text-foreground/60' />
		</div>
	);
}

export default ThemeToggle;

import { Button } from '@/components/ui/button'
import { useTheme } from './useTheme'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={toggleTheme}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  )
}

export default ThemeToggle

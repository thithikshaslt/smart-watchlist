import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'

const FEATURES = [
  { title: 'Adaptive views', body: 'Show only the metrics you actually care about, per watchlist.' },
  { title: 'Signal, not noise', body: "Know when a move is genuinely unusual for that stock — not just today's percent change." },
  { title: 'Since you last checked', body: 'Come back and see exactly what changed while you were away.' },
]

function LandingPage() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/watchlists" replace />
  }

  return (
    <div className="relative flex min-h-[calc(100svh-57px)] flex-col items-center justify-center overflow-hidden px-4">
      {/* Ambient background - two soft drifting gradient blobs, theme-aware opacity. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-emerald-500/30 blur-3xl dark:bg-emerald-500/20" />
        <div className="animate-blob-delayed absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl dark:bg-violet-500/20" />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 relative z-10 flex max-w-2xl flex-col items-center text-center duration-700">
        <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden className="mb-6 drop-shadow-lg">
          <rect width="48" height="48" rx="12" fill="#059669" />
          <path
            d="M9 30 L18 21 L24 27 L39 12"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="39" cy="12" r="3.5" fill="#ffffff" />
        </svg>

        <h1 className="bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          Watchlyst
        </h1>
        <p className="mt-4 text-xl font-medium text-foreground sm:text-2xl">
          See what actually moved.
        </p>
        <p className="mt-3 max-w-md text-balance text-muted-foreground">
          A market watchlist that adapts to what you track, and tells you what's
          genuinely worth noticing — not just what ticked.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/30"
          >
            <Link to="/register">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="transition-transform duration-300 hover:scale-105">
            <Link to="/login">Log in</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border bg-card/60 p-4 text-left backdrop-blur-sm transition-colors hover:bg-card"
            >
              <p className="text-sm font-semibold">{feature.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LandingPage

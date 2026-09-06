import { Link, Route, Routes } from 'react-router-dom'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import RequireAuth from '@/auth/RequireAuth'
import LandingPage from '@/landing/LandingPage'
import Logo from '@/theme/Logo'
import ThemeToggle from '@/theme/ThemeToggle'
import WatchlistDetailPage from '@/watchlists/WatchlistDetailPage'
import WatchlistsListPage from '@/watchlists/WatchlistsListPage'

function App() {
  return (
    <>
      <header className="flex items-center justify-between border-b px-6 py-3">
        <Link to="/">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/watchlists" element={<WatchlistsListPage />} />
          <Route path="/watchlists/:id" element={<WatchlistDetailPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App

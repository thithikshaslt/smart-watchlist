import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/auth/LoginPage'
import RegisterPage from '@/auth/RegisterPage'
import RequireAuth from '@/auth/RequireAuth'
import WatchlistDetailPage from '@/watchlists/WatchlistDetailPage'
import WatchlistsListPage from '@/watchlists/WatchlistsListPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/watchlists" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/watchlists" element={<WatchlistsListPage />} />
        <Route path="/watchlists/:id" element={<WatchlistDetailPage />} />
      </Route>
    </Routes>
  )
}

export default App

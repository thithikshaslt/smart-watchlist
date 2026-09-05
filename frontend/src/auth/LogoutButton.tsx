import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthContext'

function LogoutButton() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Log out
    </Button>
  )
}

export default LogoutButton

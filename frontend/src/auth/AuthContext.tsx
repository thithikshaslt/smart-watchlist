import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { apiClient, setAuthToken, setUnauthorizedHandler } from '@/lib/api-client'

const TOKEN_STORAGE_KEY = 'smart-watchlist:token'

interface RegisterResponse {
  id: string
  email: string
  createdAt: string
}

interface LoginResponse {
  accessToken: string
}

interface AuthContextValue {
  isAuthenticated: boolean
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // localStorage is read synchronously, so the session is known before the
  // first render - no separate "restoring" phase is needed.
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY),
  )

  // Keeps the module-level apiClient token in sync with React state.
  useEffect(() => {
    setAuthToken(token)
  }, [token])

  // Any 401 from apiClient means the session is no longer valid.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
      setToken(null)
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  async function register(email: string, password: string) {
    await apiClient.post<RegisterResponse>('/auth/register', { email, password })
  }

  async function login(email: string, password: string) {
    const { accessToken } = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    })
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
    setToken(accessToken)
  }

  function logout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: token !== null,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

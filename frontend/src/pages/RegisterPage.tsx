import { Navigate } from 'react-router-dom'

// Accounts are created on first social login, so registration is the login page.
export default function RegisterPage() {
  return <Navigate to="/login" replace />
}

import { redirect } from 'next/navigation'

export default function SignupPage() {
  // Redirect to login since Google handles both signup and login
  redirect('/login')
}

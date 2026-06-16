import { redirect } from 'next/navigation'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

export default function LoginRedirect() {
  redirect(`${HUB_WEB_URL}/auth/login?app=career&from=${CAREER_WEB_URL}/studio`)
}

import { redirect } from 'next/navigation'

const HUB_WEB_URL = process.env['NEXT_PUBLIC_HUB_WEB_URL'] ?? 'http://localhost:3000'
const CAREER_WEB_URL = process.env['NEXT_PUBLIC_CAREER_WEB_URL'] ?? 'http://localhost:3002'

export default function RegisterRedirect() {
  redirect(`${HUB_WEB_URL}/auth/register?app=career&from=${CAREER_WEB_URL}/studio`)
}

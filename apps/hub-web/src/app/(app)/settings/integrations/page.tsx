import { getMeetinoIntegrationStatus } from '@/lib/api'
import { fa } from '@irno/i18n'
import MeetinoIntegrationCard from './meetino-integration-card'

export default async function IntegrationsPage() {
  const status = await getMeetinoIntegrationStatus()

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {fa.integrationSettings.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {fa.integrationSettings.subtitle}
        </p>
      </div>

      {/* Meetino card */}
      <MeetinoIntegrationCard status={status} />
    </div>
  )
}

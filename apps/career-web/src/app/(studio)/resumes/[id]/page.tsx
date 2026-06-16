import { notFound } from 'next/navigation'
import { getResume, listSections, listTemplates } from '@/lib/api'
import { ResumeEditorWorkspace } from './ResumeEditorWorkspace'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeEditorPage({ params }: Props) {
  const { id } = await params
  const [resume, sections, templates] = await Promise.all([
    getResume(id),
    listSections(id),
    listTemplates(),
  ])

  if (!resume) notFound()

  return (
    <div className="h-[calc(100vh-56px)] overflow-hidden -mx-4 -mt-4 lg:-mx-8 lg:-mt-8">
      <ResumeEditorWorkspace
        resume={resume}
        initialSections={sections ?? []}
        templates={templates ?? []}
      />
    </div>
  )
}

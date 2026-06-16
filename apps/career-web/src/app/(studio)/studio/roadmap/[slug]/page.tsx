import { notFound } from 'next/navigation'
import { getRoadmap } from '@/lib/api'
import type { RoadmapNodeDto } from '@irno/types'
import { fa } from '@irno/i18n'

interface Props {
  params: Promise<{ slug: string }>
}

const nodeTypeColors: Record<string, string> = {
  TOPIC: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300',
  SKILL: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300',
  MILESTONE: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300',
  RESOURCE: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300',
}

const nodeTypeLabels: Record<string, string> = {
  TOPIC: 'موضوع',
  SKILL: 'مهارت',
  MILESTONE: 'نقطه عطف',
  RESOURCE: 'منبع',
}

function NodeItem({ node, depth = 0 }: { node: RoadmapNodeDto; depth?: number }) {
  return (
    <div className={depth > 0 ? 'mr-6 border-r border-[var(--color-border)] pr-4' : ''}>
      <div className="flex items-center gap-3 py-2">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${nodeTypeColors[node.type] ?? nodeTypeColors.TOPIC}`}>
          {nodeTypeLabels[node.type] ?? node.type}
        </span>
        <span className="text-sm text-[var(--color-text-primary)]">{node.title}</span>
      </div>
      {node.description && (
        <p className={`text-xs text-[var(--color-text-muted)] pb-1 ${depth > 0 ? '' : 'pr-0'}`}>
          {node.description}
        </p>
      )}
      {node.children && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map((child) => (
            <NodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default async function RoadmapDetailPage({ params }: Props) {
  const { slug } = await params
  const roadmap = await getRoadmap(slug)

  if (!roadmap || roadmap.status !== 'PUBLISHED') notFound()

  const nodes = roadmap.nodes ?? []

  // Build tree: top-level nodes (no parentId)
  const topLevel = nodes.filter((n) => !n.parentId)
  // Attach children
  const nodeMap = new Map<string, RoadmapNodeDto & { children: RoadmapNodeDto[] }>()
  for (const n of nodes) {
    nodeMap.set(n.id, { ...n, children: [] })
  }
  for (const n of nodes) {
    if (n.parentId) {
      const parent = nodeMap.get(n.parentId)
      if (parent) parent.children.push(nodeMap.get(n.id)!)
    }
  }
  const tree = topLevel.map((n) => nodeMap.get(n.id)!).filter(Boolean)

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
        <a href="/roadmap" className="hover:text-[var(--color-brand-600)] transition-colors">
          مسیر شغلی
        </a>
        <span>←</span>
        <span className="text-[var(--color-text-primary)]">{roadmap.title}</span>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{roadmap.title}</h1>
            {roadmap.description && (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                {roadmap.description}
              </p>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)] shrink-0">
            {fa.resumeLanguage[roadmap.language]}
          </span>
        </div>
        <div className="mt-3 text-xs text-[var(--color-text-muted)]">
          {roadmap.nodeCount} گام در این مسیر
        </div>
      </div>

      {/* Nodes */}
      {tree.length > 0 ? (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-5 space-y-1">
          <h2 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
            گام‌های مسیر
          </h2>
          {tree.map((node) => (
            <NodeItem key={node.id} node={node} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <div className="text-sm text-[var(--color-text-muted)]">این مسیر هنوز گامی ندارد.</div>
        </div>
      )}
    </div>
  )
}

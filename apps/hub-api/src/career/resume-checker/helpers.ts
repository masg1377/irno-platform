/**
 * Resume Checker — shared helper functions for rule files.
 *
 * Isolated here to avoid circular dependency:
 *   resume-checker-engine → rule files → helpers
 *   (engine does NOT import helpers; it passes ctx which already has detectedSections)
 */

import { RuleContext } from './types.js'

/**
 * Returns true if a section type is present either in:
 *   - ctx.sections (structured Irno resume sections), OR
 *   - ctx.detectedSections (plain-text detected sections from the engine)
 *
 * Rules MUST use this instead of checking ctx.sections directly —
 * otherwise uploaded/pasted resumes always report all sections as missing.
 *
 * @param minConfidence  Minimum confidence score for detectedSections (default 50)
 */
export function hasSection(ctx: RuleContext, type: string, minConfidence = 50): boolean {
  // Check structured Irno sections
  if (ctx.sections.some((s) => s.isVisible && s.type === type)) return true
  // Check plain-text detected sections
  return (ctx.detectedSections ?? []).some(
    (d) => d.type === type && d.confidence >= minConfidence,
  )
}

/**
 * Get content text for a section from either structured or detected source.
 * Merges content from ALL matching detected sections of the same type —
 * avoids the bug where the first match has empty content (from a heading-only segment)
 * but subsequent matches (from sub-sections) have real content.
 *
 * Returns empty string if section not found.
 */
export function getSectionContent(ctx: RuleContext, type: string): string {
  // From structured sections
  const structured = ctx.sections.find((s) => s.isVisible && s.type === type)
  if (structured) {
    const c = structured.content
    if (c?.['text']) return String(c['text'])
    return ''
  }
  // From detected sections — merge ALL matching sections (not just first)
  const allDetected = (ctx.detectedSections ?? []).filter(
    (d) => d.type === type && d.confidence >= 50,
  )
  return allDetected.map((d) => d.content).filter(Boolean).join('\n').trim()
}

/**
 * Count visible sections (structured + detected, deduplicated by type).
 */
export function countSections(ctx: RuleContext): number {
  const types = new Set<string>()
  for (const s of ctx.sections) {
    if (s.isVisible) types.add(s.type)
  }
  for (const d of ctx.detectedSections ?? []) {
    if (d.confidence >= 50) types.add(d.type)
  }
  return types.size
}

/**
 * Resume Checker Fixture Test
 *
 * Tests the parser and rule engine against a known English frontend resume
 * (MAHDI ASGHARI — Frontend Developer) and asserts expected outcomes.
 *
 * Run:
 *   cd apps/hub-api
 *   npx tsx src/career/resume-checker/test-fixture.ts
 *
 * Expected: all assertions pass and exit code 0.
 * On failure: prints which assertion failed and exits with code 1.
 */

import { detectSectionsFromText, runCheckerEngine, extractSkillsFromText, extractProfileHeader } from './resume-checker-engine.js'
import type { RuleContext } from './types.js'

// ── Sample Resume ─────────────────────────────────────────────────────────────

const MAHDI_RESUME = `MAHDI ASGHARI
Frontend Developer
Tehran, Iran | mahdi@example.com | github.com/mahdi-asghari | linkedin.com/in/mahdi-asghari

ABOUT ME
Passionate Frontend Developer with 3+ years of experience building modern, responsive web applications.
Specialized in React ecosystem, TypeScript, and performance optimization.
I enjoy crafting clean UIs and scalable architectures.

EXPERIENCE

Frontend Developer — Digikala
June 2022 – Present | Tehran, Iran
• Built product listing pages using React and Next.js, improving load time by 40%
• Implemented server-side rendering (SSR) and static site generation (SSG) for SEO improvements
• Collaborated with backend engineers on REST API integration
• Led migration from JavaScript to TypeScript for main dashboard (10+ components)
• Conducted code reviews and mentored two junior developers

Frontend Developer — Snapp
March 2021 – May 2022 | Tehran, Iran
• Developed real-time driver tracking UI with WebSocket and React
• Built reusable component library using Tailwind CSS and Storybook
• Reduced bundle size by 35% via code splitting and lazy loading
• Integrated Stripe payment flow into checkout system

EDUCATION

Bachelor of Science in Computer Engineering
University of Tehran | 2017 – 2021
GPA: 3.7 / 4.0

SKILLS

Technical Skills:
React, Next.js, TypeScript, JavaScript, HTML5, CSS3

Frameworks:
React, Next.js, Vue.js, Tailwind CSS, Redux, Zustand

Libraries:
Axios, React Query, Framer Motion, React Hook Form, Zod

Languages:
TypeScript, JavaScript, Python

Tools:
Git, GitHub, Vite, Webpack, ESLint, Prettier, Figma, Postman, Jest, Cypress

PROJECTS

Irno Learning Platform
Website: https://irno.academy
• Full-stack educational platform built with Next.js 14 and NestJS
• Features: course management, live sessions, certificate generation
• Tech: React, TypeScript, PostgreSQL, Prisma, Redis, Docker

Real Estate Finder
GitHub: github.com/mahdi/real-estate-finder
• Property search platform with advanced filtering and map integration
• Tech: Next.js, TypeScript, Mapbox, Supabase, Tailwind CSS
`

// ── Assertions ────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅  ${message}`)
    passed++
  } else {
    console.error(`  ❌  FAILED: ${message}`)
    failed++
  }
}

function assertGte(actual: number, min: number, message: string) {
  if (actual >= min) {
    console.log(`  ✅  ${message} (${actual} ≥ ${min})`)
    passed++
  } else {
    console.error(`  ❌  FAILED: ${message} — got ${actual}, expected ≥ ${min}`)
    failed++
  }
}

function assertLte(actual: number, max: number, message: string) {
  if (actual <= max) {
    console.log(`  ✅  ${message} (${actual} ≤ ${max})`)
    passed++
  } else {
    console.error(`  ❌  FAILED: ${message} — got ${actual}, expected ≤ ${max}`)
    failed++
  }
}

// ── Test 1: Section detection ─────────────────────────────────────────────────

console.log('\n── Test 1: Section detection ──')
const detected = detectSectionsFromText(MAHDI_RESUME)
const detectedTypes = detected.map((d) => d.type)

console.log('  Detected sections:', detected.map((d) => `${d.type}(${d.confidence}%)`).join(', '))

assert(detectedTypes.includes('SUMMARY'), 'ABOUT ME detected as SUMMARY')
assert(detectedTypes.includes('EXPERIENCE'), 'EXPERIENCE detected')
assert(detectedTypes.includes('EDUCATION'), 'EDUCATION detected')
assert(detectedTypes.includes('SKILL'), 'SKILLS detected')
assert(detectedTypes.includes('PROJECT'), 'PROJECTS detected')

// ── Test 2: Skill section has content (sub-groups merged) ─────────────────────

console.log('\n── Test 2: Skill sub-group merging ──')
const skillSection = detected.find((d) => d.type === 'SKILL')
assert(!!skillSection, 'SKILL section found in detected sections')

if (skillSection) {
  const skillContent = skillSection.content.toLowerCase()
  console.log('  Skill content preview:', skillSection.content.slice(0, 200).replace(/\n/g, ' | '))
  assert(skillContent.includes('react'), 'React found in skill content')
  assert(skillContent.includes('typescript'), 'TypeScript found in skill content')
  assert(skillContent.includes('tailwind') || skillContent.includes('css'), 'Tailwind/CSS found in skill content')
  assert(skillContent.length > 50, 'Skill content is non-trivial (sub-groups merged)')
}

// ── Test 3: Education section has content ────────────────────────────────────

console.log('\n── Test 3: Education content ──')
const educSection = detected.find((d) => d.type === 'EDUCATION')
if (educSection) {
  const educContent = educSection.content.toLowerCase()
  console.log('  Education content preview:', educSection.content.slice(0, 150).replace(/\n/g, ' | '))
  assert(
    educContent.includes('university') || educContent.includes('bachelor') || educContent.includes('computer'),
    'Education content contains university/degree terms',
  )
} else {
  assert(false, 'EDUCATION section found')
}

// ── Test 4: extractSkillsFromText picks up grouped skills ─────────────────────

console.log('\n── Test 4: extractSkillsFromText (grouped) ──')
const extractedSkills = extractSkillsFromText(MAHDI_RESUME)
console.log('  Extracted skills:', extractedSkills.join(', '))
assert(extractedSkills.length >= 5, `At least 5 skills extracted (got ${extractedSkills.length})`)
assert(
  extractedSkills.some((s) => s.toLowerCase().includes('react')),
  'React found in extracted skills',
)
assert(
  extractedSkills.some((s) => s.toLowerCase().includes('typescript') || s.toLowerCase().includes('ts')),
  'TypeScript found in extracted skills',
)

// ── Test 5: Full engine run — scores ─────────────────────────────────────────

console.log('\n── Test 5: Engine scores ──')
const ctx: RuleContext = {
  sections: [],
  fullText: MAHDI_RESUME,
  targetRole: 'Frontend Developer',
}

const result = runCheckerEngine(ctx)
const { scores, findings, diagnostics } = result

console.log('  Scores:', JSON.stringify(scores, null, 2).replace(/\n/g, ' '))
console.log('  Total findings:', findings.length)
console.log('  Critical findings:', findings.filter(f => f.severity === 'CRITICAL').length)
console.log('  Diagnostics warnings:', diagnostics.warnings)

assertGte(scores.overallScore, 55, 'Overall score ≥ 55 for a good frontend resume')
assertGte(scores.completenessScore, 60, 'Completeness score ≥ 60 (all critical sections present)')
assertGte(scores.atsScore, 50, 'ATS score ≥ 50')

const criticalFindings = findings.filter((f) => f.severity === 'CRITICAL')
assertLte(criticalFindings.length, 4, 'At most 4 critical findings for this resume')

// ── Test 6: No false CRITICAL for skills/education being missing ─────────────

console.log('\n── Test 6: No false positives for skills/education ──')
const skillMissingFinding = findings.find(
  (f) => f.severity === 'CRITICAL' && f.message?.toLowerCase().includes('skill'),
)
const educMissingFinding = findings.find(
  (f) => f.severity === 'CRITICAL' && f.message?.toLowerCase().includes('education'),
)

assert(!skillMissingFinding, 'No CRITICAL "skills missing" false positive')
assert(!educMissingFinding, 'No CRITICAL "education missing" false positive')

// ── Test 7: Job description keyword match ────────────────────────────────────

console.log('\n── Test 7: Job description keyword match ──')
const jdCtx: RuleContext = {
  sections: [],
  fullText: MAHDI_RESUME,
  targetRole: 'Frontend Developer',
  jobDescription: `
    We are looking for a Frontend Developer to join our team.
    Requirements:
    - Strong experience with React and TypeScript
    - Experience with Next.js, SSR, and SSG
    - Knowledge of REST API integration
    - Git and version control workflows
    - Tailwind CSS or similar utility-first CSS frameworks
    - Testing with Jest or Cypress is a plus
    - Experience with Docker or CI/CD is beneficial
  `,
}
const jdResult = runCheckerEngine(jdCtx)

assert(jdResult.keywordMatch !== null, 'keywordMatch returned when JD provided')
if (jdResult.keywordMatch) {
  const km = jdResult.keywordMatch
  console.log(`  Match rate: ${km.matchRate}%`)
  console.log(`  Matched: ${km.matched.join(', ')}`)
  console.log(`  Missing: ${km.missing.join(', ')}`)
  assertGte(km.matchRate, 40, 'Job match rate ≥ 40% for a matching resume+JD')
  assert(km.matched.some((k) => /react|typescript|next/i.test(k)), 'React/TypeScript/Next.js in matched keywords')
}

// ── Test 8: Diagnostics ───────────────────────────────────────────────────────

console.log('\n── Test 8: Parser diagnostics ──')
assert(!!result.diagnostics, 'diagnostics field present in engine result')
if (result.diagnostics) {
  assert(result.diagnostics.detectedSections.length >= 4, 'At least 4 sections in diagnostics')
  assert(result.diagnostics.textLength > 100, 'textLength in diagnostics')
  // Should not warn about missing SKILL or EDUCATION since they are present
  const warnsSKILL = result.diagnostics.warnings.some((w) => w.includes('SKILL') && w.includes('شناسایی نشد'))
  const warnsEDUC = result.diagnostics.warnings.some((w) => w.includes('EDUCATION') && w.includes('شناسایی نشد'))
  assert(!warnsSKILL, 'diagnostics does NOT warn SKILL section missing')
  assert(!warnsEDUC, 'diagnostics does NOT warn EDUCATION section missing')
}

// ── Test 9 (Phase 18.2): Heading detection — no false positives ───────────────
// These lines must NOT be classified as section headings.

console.log('\n── Test 9: Heading detection — no false positives (Phase 18.2A) ──')
{
  const falsePositiveCandidates = [
    'Frontend Developer with 6+ years of experience in React and TypeScript',
    'Reduced project size by 40% through code splitting',
    'Led training sessions for junior engineers across 3 teams',
    'Delivered new authentication module in 2 weeks',
    'Implemented CI/CD pipeline using GitHub Actions',
    'Improved page load time by 35% via lazy loading',
    'React Native developer with strong mobile background',
  ]

  // Test them via detectSectionsFromText on a fragment
  for (const line of falsePositiveCandidates) {
    const fragment = `ABOUT ME\nSome summary text here.\n\n${line}\n\nSKILLS\nReact, TypeScript\n`
    const sections = detectSectionsFromText(fragment)
    // None of the false-positive lines should generate a new section between ABOUT ME and SKILLS
    const extraTypes = sections.map(s => s.type)
    // ABOUT ME → SUMMARY, SKILLS → SKILL — there should be no 3rd section injected for the middle line
    const spuriousSection = sections.find(s =>
      s.type !== 'SUMMARY' &&
      s.type !== 'SKILL' &&
      s.titleDetected !== '(inferred)' &&
      s.titleDetected.length > 5,
    )
    assert(
      !spuriousSection,
      `"${line.slice(0, 60)}" — no spurious heading (types: ${extraTypes.join(', ')})`,
    )
  }
}

// ── Test 10 (Phase 18.2): ABOUT ME has non-empty content ────────────────────

console.log('\n── Test 10: ABOUT ME section has content (not stolen by false EXPERIENCE heading) ──')
{
  const summarySection = detected.find((d) => d.type === 'SUMMARY')
  assert(!!summarySection, 'SUMMARY section detected')
  if (summarySection) {
    assert(summarySection.content.length > 30, `SUMMARY section has content (${summarySection.content.length} chars)`)
    console.log('  SUMMARY content preview:', summarySection.content.slice(0, 120).replace(/\n/g, ' | '))
  }
}

// ── Test 11 (Phase 18.2): Profile header extraction ─────────────────────────

console.log('\n── Test 11: Profile header extraction (Phase 18.2B) ──')
{
  const profile = extractProfileHeader(MAHDI_RESUME)
  console.log('  Profile extracted:', JSON.stringify(profile))
  assert(!!profile.name, `Name extracted: "${profile.name}"`)
  assert(!!profile.headline, `Headline extracted: "${profile.headline}"`)
  assert(!!profile.email, `Email extracted: "${profile.email}"`)
  assert(profile.email?.includes('@') ?? false, 'Email contains @')
}

// ── Test 12 (Phase 18.2): ATS/HR rules don't fire on resume-with-profile-header ──

console.log('\n── Test 12: ATS/HR do not fire CRITICAL for resume with visible profile header ──')
{
  // A resume with a clear header but no SUMMARY section
  const noSummaryResume = `SARA HOSSEINI
Senior Backend Developer
Tehran | sara@example.com | github.com/sara-hosseini

EXPERIENCE

Backend Developer — Cafebazaar
2021 – Present
• Built REST API with NestJS and PostgreSQL
• Improved API performance by 50%

SKILLS

Node.js, NestJS, TypeScript, PostgreSQL, Redis, Docker
`
  const noSummaryCtx: RuleContext = { sections: [], fullText: noSummaryResume }
  const noSummaryResult = runCheckerEngine(noSummaryCtx)
  const noSummaryFindings = noSummaryResult.findings
  const hrCritical = noSummaryFindings.find(
    (f) => f.ruleCode === 'no_role_visible' && f.severity === 'CRITICAL',
  )
  assert(
    !hrCritical,
    'HR no_role_visible CRITICAL NOT fired when profile header has job title',
  )
  const atsBadHeadline = noSummaryFindings.find(
    (f) => f.ruleCode === 'no_headline' && f.severity === 'CRITICAL',
  )
  assert(
    !atsBadHeadline,
    'ATS no_headline NOT fired as CRITICAL when profile header present',
  )
  console.log('  Profile from no-summary resume:', JSON.stringify(noSummaryResult.diagnostics.profile))
}

// ── Test 13 (Phase 18.2): extractSkillsFromText comprehensive coverage ──────

console.log('\n── Test 13: extractSkillsFromText — comprehensive tech term coverage (Phase 18.2C) ──')
{
  const skills = extractSkillsFromText(MAHDI_RESUME)
  console.log(`  Total extracted: ${skills.length} skills`)
  console.log('  Skills:', skills.join(', '))
  assertGte(skills.length, 15, 'At least 15 skills extracted from the test resume')
  assert(skills.some(s => /react/i.test(s)), 'React in extracted skills')
  assert(skills.some(s => /typescript/i.test(s)), 'TypeScript in extracted skills')
  assert(skills.some(s => /tailwind/i.test(s)), 'Tailwind in extracted skills')
  assert(skills.some(s => /docker/i.test(s)), 'Docker in extracted skills')
  assert(skills.some(s => /next\.?js/i.test(s)), 'Next.js in extracted skills')
  assert(skills.some(s => /jest|cypress|playwright/i.test(s)), 'Testing tool in extracted skills')
}

// ── Test 14 (Phase 18.2): STR_NO_LINKS — correct wording split ──────────────

console.log('\n── Test 14: STR_NO_LINKS — contact vs professional links (Phase 18.2I) ──')
{
  // Resume with email but no GitHub/LinkedIn
  const noLinksResume = `John Doe
Software Engineer
john@example.com | +1 555-1234

EXPERIENCE
Software Engineer — Acme Corp
2021–2024
• Built features with React and TypeScript

SKILLS
React, TypeScript, Node.js
`
  const noLinksCtx: RuleContext = { sections: [], fullText: noLinksResume }
  const noLinksResult = runCheckerEngine(noLinksCtx)
  const noLinksFindings = noLinksResult.findings
  const noContactCritical = noLinksFindings.find((f) => f.ruleCode === 'STR_NO_LINKS' && f.severity === 'WARNING')
  // Has email → should NOT get the "no contact OR no links" WARNING, only an INFO for no professional links
  assert(!noContactCritical, 'STR_NO_LINKS WARNING not fired when email/phone present (only INFO for missing prof links)')
  const infoFinding = noLinksFindings.find((f) => f.ruleCode === 'STR_NO_PROFESSIONAL_LINKS')
  assert(!!infoFinding, 'STR_NO_PROFESSIONAL_LINKS INFO finding present when email exists but no GitHub/LinkedIn')

  // Resume with absolutely no contact or links
  const totallyEmptyResume = `Jane Doe
Engineer

EXPERIENCE
Worked at some company for 3 years.

SKILLS
Python, Django
`
  const totallyEmptyCtx: RuleContext = { sections: [], fullText: totallyEmptyResume }
  const totallyEmptyResult = runCheckerEngine(totallyEmptyCtx)
  const seriousWarning = totallyEmptyResult.findings.find((f) => f.ruleCode === 'STR_NO_LINKS' && f.severity === 'WARNING')
  assert(!!seriousWarning, 'STR_NO_LINKS WARNING fired when truly no contact or professional links')
}

// ── Test 15 (Phase 18.2): No false CERTIFICATE heading from "training" ───────

console.log('\n── Test 15: No false CERTIFICATE heading from "training" keyword (Phase 18.2G) ──')
{
  const trainingResume = `Ali Rezaei
Senior Developer
ali@example.com

EXPERIENCE

Lead Developer — Torob
2020–2024
• Led training sessions for 5 junior engineers
• Trained new team members on React and TypeScript
• Delivered 3 major training workshops

SKILLS
React, TypeScript, Python
`
  const trainingDetected = detectSectionsFromText(trainingResume)
  const trainingTypes = trainingDetected.map(d => d.type)
  console.log('  Detected types:', trainingTypes.join(', '))
  assert(!trainingTypes.includes('CERTIFICATE'), '"Led training sessions" did NOT create a CERTIFICATE section')
  assert(trainingTypes.includes('EXPERIENCE'), 'EXPERIENCE section still correctly detected')
}

// ── Test D (Phase 18.1 regression): Readability collapsed structure ────────────

console.log('\n── Test D (regression): readability collapsed structure ──')
{
  const collapsedResume =
    'Ahmad Karimi Full Stack Developer ahmad@test.com ' +
    'I am a developer. ' +
    'Experience: Worked at Company A from 2020 to 2024 doing backend and frontend work using React and Node.js. ' +
    'Led the team on several initiatives. ' +
    'Built APIs with Express. ' +
    'Skills: React Node.js TypeScript PostgreSQL Docker Git AWS Python Django. ' +
    'Education: B.Sc. Computer Science University of Tehran 2016 to 2020. '
  const collapsedCtx: RuleContext = { sections: [], fullText: collapsedResume }
  const collapsedResult = runCheckerEngine(collapsedCtx)
  const readScore = collapsedResult.scores.readabilityScore
  console.log(`  readabilityScore for collapsed structure: ${readScore}`)
  // Score should be penalised vs 100 — threshold is 95 (some penalty for bad structure)
  assertLte(readScore, 95, 'readabilityScore ≤ 95 for poorly structured resume (penalised)')
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.error('\n⚠️  Some assertions failed. See above for details.')
  process.exit(1)
} else {
  console.log('\n✅  All assertions passed!')
  process.exit(0)
}

import { runCheckerEngine } from './resume-checker-engine.js'
import type { RuleContext } from './types.js'

// Test A: No experience, no projects — cap at 45
const ctxA: RuleContext = {
  sections: [],
  fullText: `Ali Rezaei\nali@example.com\n\nSKILLS\nReact, TypeScript, CSS, HTML\n`,
}
const resultA = runCheckerEngine(ctxA)
const passA = resultA.scores.achievementScore <= 45
console.log(`[A] No Exp No Projects — achievementScore: ${resultA.scores.achievementScore} (≤45): ${passA ? '✅' : '❌'}`)

// Test B: No experience but has projects — cap at 65
const ctxB: RuleContext = {
  sections: [],
  fullText: `Sara Mohammadi\nsara@example.com\n\nPROJECTS\n\nE-commerce API\nBuilt REST API with Node.js — handled 10,000 requests/day\nBlog Platform\nNext.js blog with markdown, 500 daily users\n\nSKILLS\nNode.js, TypeScript, PostgreSQL`,
}
const resultB = runCheckerEngine(ctxB)
const passB = resultB.scores.achievementScore <= 65
console.log(`[B] No Exp Has Projects — achievementScore: ${resultB.scores.achievementScore} (≤65): ${passB ? '✅' : '❌'}`)

// Test C: Has experience — NOT capped
const ctxC: RuleContext = {
  sections: [],
  fullText: `Mahdi Asghari\n\nEXPERIENCE\n\nFrontend Developer — Digikala\nJune 2022–Present\n• Built pages using React, improving load time by 40%\n• Led TypeScript migration for 10+ components\n\nSKILLS\nReact, TypeScript\n\nEDUCATION\nBSc Computer Engineering, 2021`,
}
const resultC = runCheckerEngine(ctxC)
const passC = resultC.scores.achievementScore > 65
console.log(`[C] Has Experience — achievementScore: ${resultC.scores.achievementScore} (>65): ${passC ? '✅' : '❌'}`)

// Test D: True collapse scenario — SUMMARY/EDUCATION detected but section keywords embedded in long text
// Simulates a PDF where ALL sections collapsed into 1-2 blocks, but the original had clear sections
const collapsedResume = [
  'Ali Karimi',
  'ali.karimi@email.com',
  '',
  // The whole resume was collapsed into what looks like one big paragraph:
  'I am a frontend developer with 4 years of experience building scalable web applications.',
  'I enjoy working with React and TypeScript and have a strong background in UI engineering.',
  'My work involves building reusable component libraries and integrating REST APIs in production.',
  '',
  // Section keywords are INLINE (not properly headed) — parser may not detect separate sections
  'Experience: Worked at Digikala from 2021 to 2024 as a frontend engineer.',
  'In this role I built product listing pages that served millions of users daily.',
  'I led the migration from JavaScript to TypeScript across 10+ shared components.',
  'I also improved the Lighthouse performance score from 62 to 91 on the homepage.',
  'Prior to Digikala I worked at a small startup called Kobi from 2019 to 2021.',
  'At Kobi I built internal dashboard tools and admin panels using React and Redux.',
  '',
  'Education: I completed my BSc in Computer Engineering at the University of Tehran in 2021.',
  'My final project was a real-time collaborative whiteboard application built with Node.js and WebSockets.',
  '',
  'Skills: React, TypeScript, JavaScript, Next.js, Node.js, PostgreSQL, Redis, Docker, Git, REST API, GraphQL.',
  '',
  'Projects: I built a personal e-commerce platform using Next.js and Stripe.',
  'I also built a blog CMS with markdown rendering, used by 500 readers daily.',
  'Additionally I created an open-source React component library with 200+ GitHub stars.',
  '',
  'Certifications: React Developer Certificate from Meta, 2023. AWS Cloud Practitioner, 2022.',
  '',
  'Languages: Persian (native), English (professional working proficiency, B2 level).',
].join('\n')

const ctxD: RuleContext = { sections: [], fullText: collapsedResume }
const resultD = runCheckerEngine(ctxD)
const rdFindingsD = resultD.findings.filter(f => f.category === 'READABILITY')
const collapseWarning = rdFindingsD.find(f => f.ruleCode === 'RD_COLLAPSED_STRUCTURE')
const wCount = collapsedResume.split(/\s+/).filter(Boolean).length
console.log(`\n[D] Collapsed Structure:`)
console.log(`    wordCount: ${wCount}`)
console.log(`    detectedSections: ${resultD.diagnostics.detectedSections.map(d => `${d.type}(${d.confidence})`).join(', ')}`)
console.log(`    totalSectionCount: ${resultD.diagnostics.detectedSections.filter(d => d.confidence >= 50).length}`)
console.log(`    readabilityScore: ${resultD.scores.readabilityScore}`)
console.log(`    RD findings: ${rdFindingsD.map(f => `${f.ruleCode}(${f.severity})`).join(', ')}`)
console.log(`    RD_COLLAPSED_STRUCTURE fires: ${collapseWarning ? '✅ YES' : '❌ NO'}`)

// Test E: Huge word count (> 800 words) — too_long as WARNING, not near 100
const bigText = Array(120).fill('React TypeScript experienced frontend developer built many applications worked on teams').join(' ')
const ctxE: RuleContext = { sections: [], fullText: bigText }
const resultE = runCheckerEngine(ctxE)
const tooLongFinding = resultE.findings.find(f => f.ruleCode === 'RD_TOO_LONG')
const passE = tooLongFinding?.severity === 'WARNING' && resultE.scores.readabilityScore < 95
console.log(`\n[E] Too Long (WARNING, score < 95): ${passE ? '✅' : '❌'} (severity: ${tooLongFinding?.severity ?? 'not found'}, score: ${resultE.scores.readabilityScore})`)

// Test F: Good resume — no unfair penalty
const ctxF: RuleContext = {
  sections: [],
  fullText: `Reza Ahmadi\nFrontend Developer\n\nSUMMARY\nFrontend developer with 4 years in React and TypeScript.\n\nEXPERIENCE\nDeveloper at Snapp, 2020–2024\nBuilt real-time UI, reduced bundle by 35%\n\nSKILLS\nReact, TypeScript, CSS`,
}
const resultF = runCheckerEngine(ctxF)
const passF = resultF.scores.readabilityScore >= 80
console.log(`[F] Good resume readabilityScore: ${resultF.scores.readabilityScore} (≥80): ${passF ? '✅' : '❌'}`)

const all = [passA, passB, passC, passE, passF]
console.log(`\n── Results: ${all.filter(Boolean).length}/${all.length} passed (Test D is informational) ──`)

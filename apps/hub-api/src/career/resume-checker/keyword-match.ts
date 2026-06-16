/**
 * Shared keyword extraction and matching utility.
 *
 * Used by:
 *   - resume-checker/rules/keyword.rules.ts  (checker scoring)
 *   - career.service.ts (job match feature)
 *
 * Rule-based, deterministic. No AI.
 */

import type { KeywordMatchResult } from './types.js'

// ── Stop words ────────────────────────────────────────────────────────────────
const STOP_WORDS_EN = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by',
  'from','as','is','was','are','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall',
  'can','need','dare','ought','used','it','its','this','that','these','those',
  'i','we','you','he','she','they','me','us','him','her','them','my','our',
  'your','his','their','what','which','who','how','when','where','why',
])

const STOP_WORDS_FA = new Set([
  'و','با','در','از','به','که','این','آن','برای','یک','تا','را','می','است',
  'بود','شده','شد','نیز','هم','یا','اما','نه','چه','ها',
])

// ── Tech term normalisation map ───────────────────────────────────────────────
export const TECH_NORMALISE: Record<string, string> = {
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'react': 'React',
  'reactjs': 'React',
  'react.js': 'React',
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next': 'Next.js',
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node': 'Node.js',
  'python': 'Python',
  'django': 'Django',
  'fastapi': 'FastAPI',
  'flask': 'Flask',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'mongo': 'MongoDB',
  'redis': 'Redis',
  'docker': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'git': 'Git',
  'github': 'GitHub',
  'gitlab': 'GitLab',
  'aws': 'AWS',
  'gcp': 'GCP',
  'azure': 'Azure',
  'tailwind': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'css': 'CSS',
  'html': 'HTML',
  'html5': 'HTML5',
  'css3': 'CSS3',
  'graphql': 'GraphQL',
  'rest': 'REST API',
  'restful': 'REST API',
  'rest api': 'REST API',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'prisma': 'Prisma',
  'nestjs': 'NestJS',
  'nest.js': 'NestJS',
  'express': 'Express.js',
  'expressjs': 'Express.js',
  'vue': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'svelte': 'Svelte',
  'react native': 'React Native',
  'expo': 'Expo',
  'flutter': 'Flutter',
  'dart': 'Dart',
  'swift': 'Swift',
  'kotlin': 'Kotlin',
  'java': 'Java',
  'go': 'Go',
  'golang': 'Go',
  'rust': 'Rust',
  'c#': 'C#',
  'csharp': 'C#',
  '.net': '.NET',
  'dotnet': '.NET',
  'linux': 'Linux',
  'nginx': 'Nginx',
  'webpack': 'Webpack',
  'vite': 'Vite',
  'eslint': 'ESLint',
  'jest': 'Jest',
  'cypress': 'Cypress',
  'selenium': 'Selenium',
  'ci/cd': 'CI/CD',
  'ci cd': 'CI/CD',
  'agile': 'Agile',
  'scrum': 'Scrum',
  'jira': 'Jira',
  'figma': 'Figma',
  'redux': 'Redux',
  'zustand': 'Zustand',
  'rxjs': 'RxJS',
  'apollo': 'Apollo',
  'turborepo': 'Turborepo',
  'monorepo': 'Monorepo',
  'pnpm': 'pnpm',
  'npm': 'npm',
  'yarn': 'Yarn',
  'livekit': 'LiveKit',
  'websocket': 'WebSocket',
  'web socket': 'WebSocket',
  'microservices': 'Microservices',
  'micro services': 'Microservices',
  'rtl': 'RTL',
  'i18n': 'i18n',
  'seo': 'SEO',
  'pwa': 'PWA',
  'ssr': 'SSR',
  'csr': 'CSR',
  'ssg': 'SSG',
  'jwt': 'JWT',
  'oauth': 'OAuth',
  'openid': 'OpenID',
  'axios': 'Axios',
  'react query': 'React Query',
  'tanstack': 'TanStack',
  'zod': 'Zod',
  'framer': 'Framer Motion',
  'vitest': 'Vitest',
  'storybook': 'Storybook',
  'shadcn': 'shadcn/ui',
  'radix': 'Radix UI',
  'mui': 'Material UI',
  'material ui': 'Material UI',
  'chakra': 'Chakra UI',
  'antd': 'Ant Design',
  'ant design': 'Ant Design',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'scss': 'SCSS',
  'styled components': 'Styled Components',
  'emotion': 'Emotion',
  'vercel': 'Vercel',
  'netlify': 'Netlify',
  'heroku': 'Heroku',
  'digitalocean': 'DigitalOcean',
  'cloudflare': 'Cloudflare',
  's3': 'AWS S3',
  'ec2': 'AWS EC2',
  'lambda': 'AWS Lambda',
  'firebase': 'Firebase',
  'supabase': 'Supabase',
  'stripe': 'Stripe',
  'twilio': 'Twilio',
  'sendgrid': 'SendGrid',
  'postman': 'Postman',
  'swagger': 'Swagger',
  'openapi': 'OpenAPI',
  'grpc': 'gRPC',
  'socket.io': 'Socket.IO',
  'socketio': 'Socket.IO',
  'kafka': 'Kafka',
  'rabbitmq': 'RabbitMQ',
  'elasticsearch': 'Elasticsearch',
  'typeorm': 'TypeORM',
  'sequelize': 'Sequelize',
  'mongoose': 'Mongoose',
  'drizzle': 'Drizzle ORM',
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    // Replace separators (slash, pipe, comma, semicolon, colon, bullet chars) with spaces
    // so "JavaScript/React" and "React|TypeScript" tokenise correctly.
    // Keep: word chars, whitespace, dot (react.js), hash (C#), plus (C++), at (@angular), hyphen
    .replace(/[/|,;:•·]/g, ' ')
    .replace(/[^\w\s.#+@-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

function extractKeywords(text: string): string[] {
  const tokens = tokenise(text)
  const keywords: string[] = []

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (!tok) continue
    if (STOP_WORDS_EN.has(tok) || STOP_WORDS_FA.has(tok)) continue

    // Try bigram first (e.g. "react native", "rest api", "react query")
    if (i + 1 < tokens.length) {
      const bigram = `${tok} ${tokens[i + 1]}`
      if (TECH_NORMALISE[bigram]) {
        keywords.push(TECH_NORMALISE[bigram])
        i++
        continue
      }
    }

    const normalised = TECH_NORMALISE[tok]
    if (normalised) {
      keywords.push(normalised)
    } else if (tok.length >= 4) {
      // Keep longer tokens not in stop-words (tech terms, role words, etc.)
      keywords.push(tok)
    }
  }

  return [...new Set(keywords)]
}

/**
 * Compare resume text against a job description and return keyword match results.
 * Both texts are tokenised and normalised using the tech term dictionary.
 */
export function computeKeywordMatch(resumeText: string, jdText: string): KeywordMatchResult {
  const jdKeywords = extractKeywords(jdText)
  const resumeKeywords = new Set(extractKeywords(resumeText).map((k) => k.toLowerCase()))

  const matched: string[] = []
  const missing: string[] = []

  for (const kw of jdKeywords) {
    if (resumeKeywords.has(kw.toLowerCase())) {
      matched.push(kw)
    } else {
      missing.push(kw)
    }
  }

  const matchRate =
    jdKeywords.length > 0
      ? Math.round((matched.length / jdKeywords.length) * 100)
      : 0

  return { matched, missing, matchRate }
}

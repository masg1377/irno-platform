import 'dotenv/config'
import { PrismaClient, UserRole, UserStatus, AppModuleStatus } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

// Prisma 7: PrismaClient requires a driver adapter — connection URL is no
// longer in schema.prisma. PrismaPg carries the PostgreSQL connection.
const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱  Seeding Irno Hub database...')

  // ── SUPER_ADMIN user ───────────────────────────────────────
  // Read from env to avoid hardcoded credentials in production.
  // Falls back to development defaults if env vars are not set.
  const adminMobile = process.env['SUPER_ADMIN_MOBILE'] ?? '09120000000'
  const adminEmail = process.env['SUPER_ADMIN_EMAIL'] ?? 'admin@irno.ir'
  const adminPassword = process.env['SUPER_ADMIN_PASSWORD'] ?? 'IrnoAdmin@2026'

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  const superAdmin = await prisma.user.upsert({
    where: { mobile: adminMobile },
    update: {},
    create: {
      email: adminEmail,
      mobile: adminMobile,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          firstName: 'مدیر',
          lastName: 'ارشد',
        },
      },
    },
  })

  console.log(`  ✓ SUPER_ADMIN created: ${superAdmin.mobile} (${superAdmin.email})`)
  if (!process.env['SUPER_ADMIN_PASSWORD']) {
    console.log(`    ⚠️  Default password in use: ${adminPassword}  ← Set SUPER_ADMIN_PASSWORD in .env for production`)
  }

  // ── App modules ────────────────────────────────────────────
  const apps = [
    {
      key: 'MEETINO',
      nameLocal: 'میتینو',
      description: 'برگزاری کلاس‌ها، جلسات آنلاین و وبینارها. میتینو با حساب ایرنو شما کار می‌کند.',
      url: process.env['MEETINO_WEB_URL'] ?? process.env['MEETINO_URL'] ?? 'https://meet.irno.ir',
      status: AppModuleStatus.ACTIVE,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.TEACHER,
        UserRole.MENTOR,
        UserRole.STUDENT,
        UserRole.APPLICANT,
      ],
      sortOrder: 1,
    },
    {
      key: 'IRNO_CHAT',
      nameLocal: 'ایرنو چت',
      description: 'پیام‌رسان داخلی آکادمی ایرنو',
      url: '#',
      status: AppModuleStatus.COMING_SOON,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.TEACHER,
        UserRole.MENTOR,
        UserRole.STUDENT,
      ],
      sortOrder: 2,
    },
    {
      key: 'IRNO_LEARN',
      nameLocal: 'ایرنو لرن',
      description: 'سیستم مدیریت محتوا و آموزش آنلاین',
      url: '#',
      status: AppModuleStatus.COMING_SOON,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.TEACHER,
        UserRole.STUDENT,
      ],
      sortOrder: 3,
    },
    {
      key: 'IRNO_PROJECTS',
      nameLocal: 'ایرنو پروجکت',
      description: 'مدیریت پروژه‌های دانشجویی',
      url: '#',
      status: AppModuleStatus.COMING_SOON,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.TEACHER,
        UserRole.MENTOR,
        UserRole.STUDENT,
      ],
      sortOrder: 4,
    },
    {
      key: 'IRNO_AI',
      nameLocal: 'ایرنو هوش مصنوعی',
      description: 'ابزارهای هوش مصنوعی برای یادگیری',
      url: '#',
      status: AppModuleStatus.COMING_SOON,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.TEACHER,
        UserRole.STUDENT,
      ],
      sortOrder: 5,
    },
    {
      key: 'IRNO_EVENTS',
      nameLocal: 'رویدادهای ایرنو',
      description: 'مدیریت وبینار، همایش، فری‌دیسکاشن و رویدادهای ایرنو',
      url: '/events',
      status: AppModuleStatus.ACTIVE,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.TEACHER,
        UserRole.MENTOR,
      ],
      sortOrder: 6,
    },
    {
      key: 'IRNO_CV',
      nameLocal: 'ایرنو CV',
      description: 'ساخت رزومه حرفه‌ای، پروفایل عمومی، پورتفولیو و مسیر شغلی',
      url: process.env['CAREER_WEB_URL'] ?? 'http://localhost:3002',
      status: AppModuleStatus.ACTIVE,
      allowedRoles: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.ACCOUNTANT,
        UserRole.TEACHER,
        UserRole.MENTOR,
        UserRole.STUDENT,
        UserRole.APPLICANT,
      ],
      sortOrder: 7,
    },
    {
      key: 'IRNO_SKILLS',
      nameLocal: 'مهارت‌ها',
      description: 'مهارت‌ها، اعتبارها و دستاوردهای یادگیری',
      url: '/skills',
      status: AppModuleStatus.COMING_SOON,
      allowedRoles: [],
      sortOrder: 8,
    },
  ]

  for (const app of apps) {
    await prisma.appModule.upsert({
      where: { key: app.key },
      update: {
        nameLocal: app.nameLocal,
        description: app.description,
        url: app.url,
        status: app.status,
        allowedRoles: app.allowedRoles,
        sortOrder: app.sortOrder,
      },
      create: app,
    })
    console.log(`  ✓ AppModule: ${app.key} (${app.status})`)
  }

  // ── Resume Templates (Phase 15) ────────────────────────────
  const resumeTemplates = [
    {
      slug: 'ats-friendly',
      title: 'ATS Friendly',
      type: 'ATS_FRIENDLY' as const,
      description: 'قالب ساده و خوانا برای سیستم‌های استخدام آنلاین. بدون گرافیک پیچیده، متن خوانا، تک‌ستونه.',
      supportsAts: true,
      supportsRtl: true,
      supportsLtr: true,
      isPremium: false,
      sortOrder: 1,
      defaultStyleConfig: { fontFamily: 'Vazirmatn', fontSize: 11, accentColor: '#1e293b', spacing: 'normal', pageSize: 'A4' },
      defaultSections: [
        { type: 'SUMMARY', title: 'خلاصه حرفه‌ای', sortOrder: 0, content: { text: '' } },
        { type: 'EXPERIENCE', title: 'سوابق کاری', sortOrder: 1, content: { items: [] } },
        { type: 'EDUCATION', title: 'تحصیلات', sortOrder: 2, content: { items: [] } },
        { type: 'SKILL', title: 'مهارت‌ها', sortOrder: 3, content: { groups: [] } },
        { type: 'CERTIFICATE', title: 'مدارک و گواهی‌نامه‌ها', sortOrder: 4, content: { items: [] } },
        { type: 'LANGUAGE', title: 'زبان‌ها', sortOrder: 5, content: { items: [] } },
      ],
    },
    {
      slug: 'modern-minimal',
      title: 'Modern Minimal',
      type: 'MODERN' as const,
      description: 'طراحی مدرن و مینیمال با تایپوگرافی قوی. مناسب برای متقاضیان فناوری و خلاقیت.',
      supportsAts: false,
      supportsRtl: true,
      supportsLtr: true,
      isPremium: false,
      sortOrder: 2,
      defaultStyleConfig: { fontFamily: 'Vazirmatn', fontSize: 11, accentColor: '#4f46e5', spacing: 'comfortable', pageSize: 'A4' },
      defaultSections: [
        { type: 'SUMMARY', title: 'درباره من', sortOrder: 0, content: { text: '' } },
        { type: 'EXPERIENCE', title: 'تجربه کاری', sortOrder: 1, content: { items: [] } },
        { type: 'SKILL', title: 'مهارت‌ها', sortOrder: 2, content: { groups: [] } },
        { type: 'PROJECT', title: 'پروژه‌ها', sortOrder: 3, content: { items: [] } },
        { type: 'EDUCATION', title: 'تحصیلات', sortOrder: 4, content: { items: [] } },
        { type: 'LANGUAGE', title: 'زبان‌ها', sortOrder: 5, content: { items: [] } },
        { type: 'LINK', title: 'لینک‌ها', sortOrder: 6, content: { items: [] } },
      ],
    },
    {
      slug: 'technical',
      title: 'Technical',
      type: 'TECHNICAL' as const,
      description: 'طراحی تخصصی برای توسعه‌دهندگان و مهندسان نرم‌افزار. تأکید بر مهارت‌های فنی و پروژه‌ها.',
      supportsAts: true,
      supportsRtl: true,
      supportsLtr: true,
      isPremium: false,
      sortOrder: 3,
      defaultStyleConfig: { fontFamily: 'Vazirmatn', fontSize: 10, accentColor: '#0f172a', spacing: 'compact', pageSize: 'A4' },
      defaultSections: [
        { type: 'SUMMARY', title: 'خلاصه فنی', sortOrder: 0, content: { text: '' } },
        { type: 'SKILL', title: 'مهارت‌های فنی', sortOrder: 1, content: { groups: [] } },
        { type: 'EXPERIENCE', title: 'سوابق کاری', sortOrder: 2, content: { items: [] } },
        { type: 'PROJECT', title: 'پروژه‌های منتخب', sortOrder: 3, content: { items: [] } },
        { type: 'EDUCATION', title: 'تحصیلات', sortOrder: 4, content: { items: [] } },
        { type: 'CERTIFICATE', title: 'گواهی‌نامه‌ها', sortOrder: 5, content: { items: [] } },
        { type: 'LINK', title: 'لینک‌های فنی', sortOrder: 6, content: { items: [] } },
      ],
    },
    {
      slug: 'academic',
      title: 'Academic',
      type: 'ACADEMIC' as const,
      description: 'قالب رسمی و آکادمیک برای محققان، اساتید و دانشجویان. مناسب برای رزومه دانشگاهی.',
      supportsAts: true,
      supportsRtl: true,
      supportsLtr: true,
      isPremium: false,
      sortOrder: 4,
      defaultStyleConfig: { fontFamily: 'Vazirmatn', fontSize: 11, accentColor: '#1e3a5f', spacing: 'normal', pageSize: 'A4' },
      defaultSections: [
        { type: 'SUMMARY', title: 'بیوگرافی حرفه‌ای', sortOrder: 0, content: { text: '' } },
        { type: 'EDUCATION', title: 'سوابق تحصیلی', sortOrder: 1, content: { items: [] } },
        { type: 'EXPERIENCE', title: 'سوابق پژوهشی و کاری', sortOrder: 2, content: { items: [] } },
        { type: 'CERTIFICATE', title: 'مقالات و مدارک', sortOrder: 3, content: { items: [] } },
        { type: 'PROJECT', title: 'پروژه‌های تحقیقاتی', sortOrder: 4, content: { items: [] } },
        { type: 'SKILL', title: 'مهارت‌ها و تخصص‌ها', sortOrder: 5, content: { groups: [] } },
        { type: 'LANGUAGE', title: 'زبان‌ها', sortOrder: 6, content: { items: [] } },
      ],
    },
  ]

  for (const tpl of resumeTemplates) {
    await (prisma as any).resumeTemplate.upsert({
      where: { slug: tpl.slug },
      update: {
        title: tpl.title,
        type: tpl.type,
        description: tpl.description,
        supportsAts: tpl.supportsAts,
        supportsRtl: tpl.supportsRtl,
        supportsLtr: tpl.supportsLtr,
        isPremium: tpl.isPremium,
        sortOrder: tpl.sortOrder,
        defaultStyleConfig: tpl.defaultStyleConfig,
        defaultSections: tpl.defaultSections,
        isActive: true,
      },
      create: {
        slug: tpl.slug,
        title: tpl.title,
        type: tpl.type,
        description: tpl.description,
        supportsAts: tpl.supportsAts,
        supportsRtl: tpl.supportsRtl,
        supportsLtr: tpl.supportsLtr,
        isPremium: tpl.isPremium,
        sortOrder: tpl.sortOrder,
        defaultStyleConfig: tpl.defaultStyleConfig,
        defaultSections: tpl.defaultSections,
        isActive: true,
      },
    })
    console.log(`  ✓ ResumeTemplate: ${tpl.slug} (${tpl.type})`)
  }

  console.log('\n✅  Seed complete.')
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

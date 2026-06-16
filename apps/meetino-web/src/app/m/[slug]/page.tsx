import { redirect } from 'next/navigation';

// Next.js 15+: params is a Promise and must be awaited in server components.
export default async function MeetingRootPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/m/${slug}/prejoin`);
}

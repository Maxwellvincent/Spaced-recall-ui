import { redirect } from 'next/navigation';

export default function ProjectRedirectPage({ params }) {
  redirect(`/dashboard/projects/${params.projectId}`);
  return null;
} 
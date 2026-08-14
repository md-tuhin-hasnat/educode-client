import { redirect } from 'next/navigation';

export default function AssessmentRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/teacher/assessments/${params.id}/arena`);
}

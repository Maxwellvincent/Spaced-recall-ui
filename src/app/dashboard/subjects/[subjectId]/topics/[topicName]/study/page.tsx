import StudySession from '@/components/StudySession';

interface PageProps {
  params: {
    subjectId: string;
    topicName: string;
  }
}

export default function StudyPage({ params }: PageProps) {
  return <StudySession subjectId={params.subjectId} topicName={params.topicName} />;
} 
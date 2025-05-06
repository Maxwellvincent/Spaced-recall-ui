import { useState } from 'react';
import { migrateSubject } from '@/lib/migrations/updateSubjectFields';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MigrationButtonProps {
  subjectId: string;
  onMigrationComplete?: () => void;
}

export function MigrationButton({ subjectId, onMigrationComplete }: MigrationButtonProps) {
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateSubject(subjectId);
      
      if (result.success) {
        toast.success('Subject data has been successfully updated');
        onMigrationComplete?.();
      } else {
        toast.error(result.message || 'Failed to update subject data');
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('An error occurred while updating the subject');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <button
      onClick={handleMigration}
      disabled={isMigrating}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isMigrating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Updating Data...</span>
        </>
      ) : (
        <span>Update Subject Data</span>
      )}
    </button>
  );
} 
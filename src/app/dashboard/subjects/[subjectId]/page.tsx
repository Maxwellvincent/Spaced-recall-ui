"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, updateDoc, collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import type { Subject } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
// Import icons individually
import { Loader2 } from "lucide-react";
import { Plus } from "lucide-react";
import { Download } from "lucide-react";
import { FileText } from "lucide-react";
import { Trash } from "lucide-react";
import { Settings } from "lucide-react";
import { Pencil } from "lucide-react";
import { MigrationButton } from '@/components/MigrationButton';
import { SubjectAnalytics } from '@/components/SubjectAnalytics';
import { SubjectReviewDashboard } from '@/components/SubjectReviewDashboard';
import { ExamModeSettings } from '@/components/ExamModeSettings';
import { toast } from "sonner";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Switch from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotionSyncOptions, ObsidianSyncOptions } from "@/types/sync";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDbzPowerLevel, getDbzMilestone } from '@/lib/dbzPowerLevel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { getProgressBarGradientClass } from '@/lib/utils/progressBarGradient';
import { PracticeQuizSection } from '@/components/PracticeQuizSection';
import { Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Custom Sync icon as fallback
const CustomSyncIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M21 2v6h-6"></path>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
    <path d="M3 22v-6h6"></path>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
  </svg>
);

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

interface ExtendedSubject extends Subject {
  id: string;
  userId: string;
  purpose?: string;
}

interface PageProps {
  params: { subjectId: string };
}

// Type for MCAT score history
type MCATScore = {
  id: string;
  CPBS?: number;
  CARS?: number;
  BBLS?: number;
  PSBB?: number;
  total?: number;
  source?: string;
  type?: string;
  timestamp?: string;
};

interface ScoreForm {
  CPBS: string;
  CARS: string;
  BBLS: string;
  PSBB: string;
  total: string;
  source: string;
  type: string;
  [key: string]: string;
}

export default function SubjectDetailsPage({ params }: PageProps) {
  const subjectId = decodeURIComponent(params.subjectId);
  
  const { user, loading } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<ExtendedSubject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [syncTarget, setSyncTarget] = useState<'notion' | 'obsidian'>('notion');
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | 'both'>('push');
  const [conflictResolution, setConflictResolution] = useState<'local' | 'external' | 'manual' | 'newest'>('newest');
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeSpacedRepetitionInfo, setIncludeSpacedRepetitionInfo] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedStudyStyle, setEditedStudyStyle] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [scoreForm, setScoreForm] = useState<ScoreForm>({
    CPBS: '',
    CARS: '',
    BBLS: '',
    PSBB: '',
    total: '',
    source: '',
    type: 'full-length',
  });
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<MCATScore[]>([]);
  
  // Get theme information
  const { theme } = useTheme();
  
  // Function to get theme-specific styles
  const getThemeStyles = () => {
    switch (theme?.toLowerCase()) {
      case 'dbz':
        return {
          primary: 'bg-yellow-600 hover:bg-yellow-700',
          secondary: 'bg-yellow-700/50',
          accent: 'text-yellow-400',
          border: 'border-yellow-600',
          cardBg: 'bg-yellow-950/50',
          topicCard: 'bg-yellow-900 hover:bg-yellow-800',
          progressBar: 'bg-yellow-500',
          header: 'Training Details',
          buttonHover: 'hover:bg-yellow-700',
          textPrimary: 'text-white',
          textSecondary: 'text-yellow-100',
          textMuted: 'text-yellow-200/80'
        };
      case 'naruto':
        return {
          primary: 'bg-orange-600 hover:bg-orange-700',
          secondary: 'bg-orange-700/50',
          accent: 'text-orange-400',
          border: 'border-orange-600',
          cardBg: 'bg-orange-950/50',
          topicCard: 'bg-orange-900 hover:bg-orange-800',
          progressBar: 'bg-orange-500',
          header: 'Jutsu Details',
          buttonHover: 'hover:bg-orange-700',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-100',
          textMuted: 'text-orange-200/80'
        };
      case 'hogwarts':
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          secondary: 'bg-purple-700/50',
          accent: 'text-purple-400',
          border: 'border-purple-600',
          cardBg: 'bg-purple-950/50',
          topicCard: 'bg-purple-900 hover:bg-purple-800',
          progressBar: 'bg-purple-500',
          header: 'Spellbook Details',
          buttonHover: 'hover:bg-purple-700',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-100',
          textMuted: 'text-purple-200/80'
        };
      default:
        return {
          primary: 'bg-blue-600 hover:bg-blue-700',
          secondary: 'bg-blue-700/50',
          accent: 'text-blue-400',
          border: 'border-blue-600',
          cardBg: 'bg-slate-800',
          topicCard: 'bg-slate-700 hover:bg-slate-600',
          progressBar: 'bg-blue-500',
          header: 'Subject Details',
          buttonHover: 'hover:bg-blue-700',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-100',
          textMuted: 'text-slate-300'
        };
    }
  };

  const themeStyles = getThemeStyles();

  const fetchSubject = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      console.log('Attempting to fetch subject with ID:', subjectId);
      
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      
      if (!subjectDoc.exists()) {
        console.error('Subject not found:', subjectId);
        setError('Subject not found. Please try again later.');
        return;
      }

      const subjectData = subjectDoc.data() as ExtendedSubject;
      
      // Check if the subject belongs to the current user
      if (subjectData.userId !== user.uid) {
        console.error('Access denied: Subject does not belong to current user');
        setError('Access denied: This subject does not belong to you');
        return;
      }

      // Calculate progress if it doesn't exist
      if (!subjectData.progress) {
        const totalXP = subjectData.topics.reduce((sum, t) => sum + (t.xp || 0), 0);
        const averageMastery = Math.floor(
          subjectData.topics.reduce((sum, t) => sum + (t.masteryLevel || 0), 0) / 
          (subjectData.topics.length || 1)
        );
        
        subjectData.progress = {
          totalXP,
          averageMastery,
          completedTopics: subjectData.topics.filter(t => (t.masteryLevel || 0) >= 80).length,
          totalTopics: subjectData.topics.length,
          lastStudied: new Date().toISOString()
        };
      }

      const fullSubjectData = {
        ...subjectData,
        id: subjectDoc.id,
        topics: subjectData.topics || [],
        masteryPath: subjectData.masteryPath || {
          currentLevel: 1,
          nextLevel: 2,
          progress: 0
        }
      };

      console.log('Subject data loaded:', {
        id: fullSubjectData.id,
        name: fullSubjectData.name,
        progress: fullSubjectData.progress,
        topicsCount: fullSubjectData.topics.length,
        totalXP: fullSubjectData.topics.reduce((sum, t) => sum + (t.xp || 0), 0)
      });

      setSubject(fullSubjectData);
    } catch (error) {
      console.error('Error fetching subject:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
        setError(`Error loading subject: ${error.message}`);
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    fetchSubject();
  }, [user, loading, subjectId, router]);

  // Fetch MCAT score history if subject is MCAT
  useEffect(() => {
    if (subject && (subject.name?.toLowerCase() === 'mcat' || subject.id === 'cdvFdHpvHOha7SZuOCLS') && user) {
      const fetchScores = async () => {
        const scoresRef = collection(db, 'users', user.uid, 'mcatScores');
        const q = query(scoresRef, orderBy('timestamp', 'asc'));
        const snap = await getDocs(q);
        setScoreHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      };
      fetchScores();
    }
  }, [subject, user]);

  // Add a function to handle exporting to Obsidian
  const handleExportToObsidian = async () => {
    try {
      const response = await fetch('/api/integrations/obsidian/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: subject.id,
          format: 'markdown',
          includeProgress: true,
          includeSpacedRepetitionInfo: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export to Obsidian');
      }

      // Get the file as a blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${subject.name.replace(/[/\\?%*:|"<>]/g, '-')}.zip`;
      
      // Append to the document and trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Successfully exported to Obsidian!');
    } catch (error) {
      console.error('Error exporting to Obsidian:', error);
      toast.error('Failed to export to Obsidian. Please try again.');
    }
  };

  // Add a function to handle exporting to Notion
  const handleExportToNotion = async () => {
    try {
      const response = await fetch('/api/integrations/notion/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: subject.id,
          targetType: 'page',
          includeProgress: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export to Notion');
      }

      const data = await response.json();
      
      if (data.pageId) {
        toast.success('Successfully exported to Notion!');
      } else {
        toast.error('Failed to export to Notion. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting to Notion:', error);
      toast.error('Failed to export to Notion. Please try again.');
    }
  };

  // Add a function to handle syncing with Notion
  const handleSyncWithNotion = async () => {
    if (!subject) return;

    setSyncLoading(true);

    try {
      const syncOptions: NotionSyncOptions = {
        direction: syncDirection,
        conflictResolution,
        includeProgress,
        includeSpacedRepetitionInfo,
        syncSubjects: true,
        syncTopics: true,
        syncConcepts: true,
        workspaceId: '',
      };

      const response = await fetch('/api/integrations/notion/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(syncOptions),
      });

      if (!response.ok) {
        throw new Error('Failed to sync with Notion');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Successfully synced with Notion! ${result.syncedItems} items synchronized.`);
        if (result.conflicts > 0) {
          toast.info(`${result.conflicts} conflicts were resolved.`);
        }
        setSyncDialogOpen(false);
      } else {
        toast.error('Sync failed. Please try again.');
      }
    } catch (error) {
      console.error('Error syncing with Notion:', error);
      toast.error('Failed to sync with Notion. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Add a function to handle syncing with Obsidian
  const handleSyncWithObsidian = async () => {
    if (!subject) return;

    setSyncLoading(true);

    try {
      const syncOptions: ObsidianSyncOptions = {
        direction: syncDirection,
        conflictResolution,
        includeProgress,
        includeSpacedRepetitionInfo,
        syncSubjects: true,
        syncTopics: true,
        syncConcepts: true,
        vaultPath: 'default',
        structureType: 'folders'
      };

      if (syncDirection === 'push') {
        // Push-only sync (download zip file)
        const response = await fetch('/api/integrations/obsidian/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(syncOptions),
        });

        if (!response.ok) {
          throw new Error('Failed to sync with Obsidian');
        }

        // Get the file as a blob
        const blob = await response.blob();
        
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${subject.name.replace(/[/\\?%*:|"<>]/g, '-')}.zip`;
        
        // Append to the document and trigger the download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Successfully pushed to Obsidian!');
        setSyncDialogOpen(false);
      } else if (selectedFile) {
        // Pull or bi-directional sync (upload file)
        const formData = new FormData();
        formData.append('files', selectedFile);
        formData.append('options', JSON.stringify(syncOptions));

        const response = await fetch('/api/integrations/obsidian/sync', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to sync with Obsidian');
        }

        const result = await response.json();
        
        if (result.success) {
          toast.success(`Successfully synced with Obsidian! ${result.syncedItems} items synchronized.`);
          if (result.conflicts > 0) {
            toast.info(`${result.conflicts} conflicts were resolved.`);
          }
          setSyncDialogOpen(false);
        } else {
          toast.error('Sync failed. Please try again.');
        }
      } else {
        toast.error('Please select a file to sync from Obsidian');
      }
    } catch (error) {
      console.error('Error syncing with Obsidian:', error);
      toast.error('Failed to sync with Obsidian. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Add a function to handle subject deletion
  const handleDeleteSubject = async () => {
    if (!subject) return;
    setDeleteLoading(true);
    
    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      toast.success('Subject deleted successfully');
      router.push('/subjects');
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error('Failed to delete subject');
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // Add a function to handle editing subject
  const handleEditSubject = async () => {
    if (!subject) return;
    setIsEditing(true);
    try {
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        name: editedName,
        description: editedDescription,
        studyStyle: editedStudyStyle,
        updatedAt: new Date().toISOString()
      });
      setSubject(s => s ? {
        ...s,
        name: editedName,
        description: editedDescription,
        studyStyle: editedStudyStyle
      } : s);
      toast.success('Subject updated successfully');
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating subject:', error);
      toast.error('Failed to update subject. Please try again.');
    } finally {
      setIsEditing(false);
    }
  };

  // Add a function to set up the edit dialog with current values
  const setupEditDialog = () => {
    if (!subject) return;
    console.log('[DEBUG] setupEditDialog called');
    setEditedName(subject.name);
    setEditedDescription(subject.description || "");
    setEditedStudyStyle(subject.studyStyle || "");
    setEditDialogOpen(true);
  };

  // Update the router.push calls for topic navigation
  const handleTopicClick = (topicName: string) => {
    console.log('Navigating to topic:', topicName);
    router.push(`/subjects/${subject.id}/topics/${encodeURIComponent(topicName)}`);
  };

  // MCAT Section Definitions
  const MCAT_SECTIONS = [
    { id: 'CPBS', name: 'Chemical and Physical Foundations of Biological Systems', description: 'Tests chemistry, physics, and biochemistry as they relate to living systems.' },
    { id: 'CARS', name: 'Critical Analysis and Reasoning Skills', description: 'Assesses reading comprehension, analysis, and reasoning skills using passages from a variety of disciplines.' },
    { id: 'BBLS', name: 'Biological and Biochemical Foundations of Living Systems', description: 'Focuses on biology and biochemistry, as well as organic and inorganic chemistry concepts.' },
    { id: 'PSBB', name: 'Psychological, Social, and Biological Foundations of Behavior', description: 'Tests understanding of psychology, sociology, and biological foundations of behavior.' },
  ];

  // Score input handler
  const handleScoreInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setScoreForm(f => ({ ...f, [name]: value }));
  };
  const handleScoreType = (val: string) => setScoreForm(f => ({ ...f, type: val }));

  // Score submit handler
  const handleScoreSubmit = async () => {
    setScoreLoading(true);
    try {
      const { CPBS, CARS, BBLS, PSBB, source, type } = scoreForm;
      // Only require at least one section
      if (!CPBS && !CARS && !BBLS && !PSBB) {
        toast.error('Enter at least one section score');
        setScoreLoading(false);
        return;
      }
      const total = [CPBS, CARS, BBLS, PSBB].map(Number).filter(Boolean).reduce((a, b) => a + b, 0);
      const entry = {
        timestamp: new Date().toISOString(),
        CPBS: CPBS ? Number(CPBS) : null,
        CARS: CARS ? Number(CARS) : null,
        BBLS: BBLS ? Number(BBLS) : null,
        PSBB: PSBB ? Number(PSBB) : null,
        total: total || null,
        source: source || '',
        type: type || 'full-length',
      };
      await addDoc(collection(db, 'users', user.uid, 'mcatScores'), entry);
      toast.success('Score added!');
      setScoreDialogOpen(false);
      setScoreForm({ CPBS: '', CARS: '', BBLS: '', PSBB: '', total: '', source: '', type: 'full-length' });
      // Refresh history
      const scoresRef = collection(db, 'users', user.uid, 'mcatScores');
      const q = query(scoresRef, orderBy('timestamp', 'asc'));
      const snap = await getDocs(q);
      setScoreHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      toast.error('Failed to add score');
    } finally {
      setScoreLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${themeStyles.accent}`} />
          <p className={themeStyles.textPrimary}>Loading subject...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`${themeStyles.cardBg} p-8 rounded-lg text-center max-w-md ${themeStyles.border}`}>
          <h2 className="text-2xl font-bold text-red-400 mb-4">Subject Not Found</h2>
          <p className={`${themeStyles.textSecondary} mb-6`}>
            The subject you're looking for could not be found. It may have been deleted or you might not have access to it.
          </p>
          <Link 
            href="/subjects" 
            className={`inline-block ${themeStyles.primary} text-white px-6 py-2 rounded-lg transition`}
          >
            Return to Subjects
          </Link>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${themeStyles.accent}`} />
          <p className={themeStyles.textPrimary}>Loading subject...</p>
        </div>
      </div>
    );
  }

  // Debug: Log the subject object to help diagnose MCAT section rendering
  console.log('Loaded subject:', subject);

  if (subject && (subject.studyStyle === 'exam' || subject.studyStyle === 'study')) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header Section */}
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 ${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
            <div className="flex items-start justify-between w-full">
              <div>
                <h1 className="text-3xl font-bold mb-2">{subject.name}</h1>
                {subject.studyStyle === 'exam' && (
                  <span className={`inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${themeStyles.accent}`} style={{ background: 'rgba(59,130,246,0.15)' }}>
                    Exam-based Study
                  </span>
                )}
                {subject.studyStyle === 'study' && (
                  <span className={`inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${themeStyles.accent}`} style={{ background: 'rgba(16,185,129,0.15)' }}>
                    Study-based
                  </span>
                )}
                <p className={themeStyles.textSecondary}>{subject.description}</p>
                {subject.purpose && <p className="mt-2 text-sm text-slate-400 italic">Purpose: {subject.purpose}</p>}
              </div>
              <button
                onClick={setupEditDialog}
                aria-label="Edit Subject Settings"
                className="ml-4 p-2 rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Edit Subject Settings"
              >
                <Settings className="w-6 h-6 text-slate-400 hover:text-blue-400" />
              </button>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <div className="flex items-center gap-4">
                <div className="flex items-center">
                  <span className={themeStyles.textSecondary}>Mastery:</span>
                  <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{subject.progress?.averageMastery || 0}%</span>
                </div>
                <div className="flex items-center">
                  <span className={themeStyles.textSecondary}>XP:</span>
                  <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{subject.progress?.totalXP || 0}</span>
                </div>
              </div>
              <div className="w-full max-w-xs mt-2">
                <div className="relative w-full h-4 bg-slate-700/70 rounded-lg border border-slate-600 shadow-sm overflow-hidden">
                  <div
                    className={`absolute left-0 top-0 h-full ${getProgressBarGradientClass(theme)}`}
                    style={{
                      width: `${subject.progress?.averageMastery || 0}%`,
                      transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
                    }}
                  />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow">
                    {subject.progress?.averageMastery || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* MCAT Section: Render only Add Section Score button and Score History, no big card */}
          {((subject.name && subject.name.toLowerCase().includes('mcat')) ||
            (subject.id && ['cdvFdHpvHOha7SZuOCLS'].includes(subject.id))) && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Button onClick={() => setScoreDialogOpen(true)} size="sm">Add Section Score</Button>
              </div>
              {/* Score History Chart with tooltips on legend */}
              {scoreHistory.length > 0 && (
                <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} mb-4`}>
                  <h3 className="text-xl font-semibold mb-2">Score History</h3>
                  <Line
                    data={{
                      labels: scoreHistory.map(s => s && s.timestamp ? new Date(s.timestamp as string).toLocaleDateString() : ''),
                      datasets: [
                        { label: 'CPBS', data: scoreHistory.map(s => s.CPBS), borderColor: '#f59e42', backgroundColor: 'rgba(245,158,66,0.2)' },
                        { label: 'CARS', data: scoreHistory.map(s => s.CARS), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)' },
                        { label: 'BBLS', data: scoreHistory.map(s => s.BBLS), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)' },
                        { label: 'PSBB', data: scoreHistory.map(s => s.PSBB), borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.2)' },
                        { label: 'Total', data: scoreHistory.map(s => s.total), borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.2)', borderDash: [5,5] },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            generateLabels: chart => {
                              const sectionMap = MCAT_SECTIONS.reduce((acc, sec) => {
                                acc[sec.id] = sec;
                                return acc;
                              }, {} as Record<string, typeof MCAT_SECTIONS[number]>);
                              return chart.data.datasets.map((dataset, i) => {
                                return {
                                  text: dataset.label ? String(dataset.label) : '',
                                  fillStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#888',
                                  strokeStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#888',
                                  hidden: !chart.isDatasetVisible(i),
                                  lineCap: 'butt',
                                  lineDash: (dataset as any)?.borderDash || [],
                                  lineDashOffset: 0,
                                  lineJoin: 'miter',
                                  lineWidth: 2,
                                  pointStyle: 'line',
                                  datasetIndex: i,
                                };
                              }) as import('chart.js').LegendItem[];
                            },
                          },
                          // Custom: show tooltip on hover (handled below)
                        },
                        // Custom plugin to show shadcn/ui Tooltip on legend hover
                        tooltip: {
                          enabled: true,
                          callbacks: {
                            label: function(context) {
                              const label = context.dataset.label || '';
                              const sec = MCAT_SECTIONS.find(s => s.id === label);
                              return sec ? `${label}: ${sec.name} — ${sec.description}` : label;
                            }
                          }
                        }
                      },
                      scales: { y: { min: 110, max: 135 } },
                    }}
                    height={120}
                  />
                </div>
              )}
              {/* Score Input Dialog (unchanged) */}
              <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add MCAT Section Score</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Label>Test/Source Name</Label>
                    <Input name="source" value={scoreForm.source} onChange={handleScoreInput} placeholder="e.g. AAMC FL1, Kaplan FL2, Section Bank, Custom" />
                    <Label>Type</Label>
                    <Select value={scoreForm.type} onValueChange={handleScoreType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-length">Full-length</SelectItem>
                        <SelectItem value="section">Section</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                      {MCAT_SECTIONS.map(sec => (
                        <div key={sec.id}>
                          <Label>{sec.id}</Label>
                          <Input
                            name={sec.id}
                            type="number"
                            min={118}
                            max={132}
                            value={scoreForm[sec.id as keyof ScoreForm]}
                            onChange={handleScoreInput}
                            placeholder="---"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleScoreSubmit} disabled={scoreLoading} size="sm">Save</Button>
                    <DialogClose asChild>
                      <Button variant="outline" size="sm">Cancel</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
          {/* Tabs Section */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="exam">Exam Mode & Review</TabsTrigger>
              <TabsTrigger value="quiz">Quiz & Practice</TabsTrigger>
              <TabsTrigger value="topics">Topics & Concepts</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              {/* Charts, recent activity, upcoming reviews, summary */}
              <SubjectAnalytics subjectId={subject.id} topics={subject.topics || []} progress={subject.progress} themeStyles={themeStyles} />
              {/* Add recent activity, upcoming reviews, etc. here */}
            </TabsContent>
            <TabsContent value="exam">
              <SubjectReviewDashboard subject={subject} onSync={() => router.refresh()} themeStyles={themeStyles} />
            </TabsContent>
            <TabsContent value="quiz">
              {/* Quiz/practice UI, weak areas, performance breakdown */}
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} mt-4`}>
                <h2 className="text-xl font-semibold mb-2">Quiz & Practice</h2>
                {/* Practice Quiz Section */}
                <PracticeQuizSection subjectId={subject.id} topics={subject.topics || []} themeStyles={themeStyles} />
              </div>
            </TabsContent>
            <TabsContent value="topics">
              {/* Topics/concepts relational database table */}
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} mt-4`}>
                <h2 className="text-xl font-semibold mb-4">Topics & Concepts</h2>
                <AddTopicButton themeStyles={themeStyles} onAdd={(topic: any) => setSubject(s => s ? {
                  ...s,
                  topics: [...(s.topics || []), topic]
                } : s)} subjectId={subject.id} db={db} fetchSubject={fetchSubject} />
                <RelationalTopicsTable topics={subject.topics || []} subjectId={subject.id} themeStyles={themeStyles} router={router} db={db} fetchSubject={fetchSubject} />
              </div>
            </TabsContent>
            <TabsContent value="resources">
              {/* Resources list */}
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} mt-4`}>
                <h2 className="text-xl font-semibold mb-2">Resources</h2>
                {/* Render resources here */}
              </div>
            </TabsContent>
          </Tabs>
          {/* Settings Dialog (must be present for modal to open) */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Subject</DialogTitle>
                <DialogDescription>Update subject details below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Label htmlFor="subjectName">Name</Label>
                <Input id="subjectName" value={editedName} onChange={e => setEditedName(e.target.value)} />
                <Label htmlFor="subjectDescription">Description</Label>
                <Input id="subjectDescription" value={editedDescription} onChange={e => setEditedDescription(e.target.value)} />
                <Label htmlFor="studyStyle">Study Style</Label>
                <Select value={editedStudyStyle} onValueChange={setEditedStudyStyle}>
                  <SelectTrigger id="studyStyle">
                    <SelectValue placeholder="Select study style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill">Skill-based</SelectItem>
                    <SelectItem value="exam">Exam-based</SelectItem>
                    <SelectItem value="study">Study-based</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 mt-4">
                  <Switch id="showExamFeatures" checked={subject.showExamFeatures} onCheckedChange={setSubject} />
                  <Label htmlFor="showExamFeatures">Show Exam/Quiz/Review Features</Label>
                </div>
                {(editedStudyStyle === 'exam' || editedStudyStyle === 'study') && (
                  <div className="mt-4">
                    <ExamModeSettings subject={subject} onUpdate={fetchSubject} compact={true} />
                  </div>
                )}
              </div>
              <DialogFooter className="flex flex-row gap-2">
                <Button onClick={handleEditSubject} disabled={isEditing} size="sm">Save</Button>
                <ArchiveDeleteButtons
                  subjectId={subject.id}
                  archived={subject.archived}
                  onArchive={async () => {
                    try {
                      await updateDoc(doc(db, 'subjects', subject.id), { archived: true, updatedAt: new Date().toISOString() });
                      toast.success('Subject archived');
                      setEditDialogOpen(false);
                      fetchSubject();
                    } catch (e) {
                      toast.error('Failed to archive subject');
                    }
                  }}
                  onDelete={async () => {
                    if (!window.confirm('Are you sure you want to permanently delete this subject? This cannot be undone.')) return;
                    setDeleteLoading(true);
                    try {
                      await deleteDoc(doc(db, 'subjects', subject.id));
                      toast.success('Subject deleted');
                      setEditDialogOpen(false);
                      router.push('/dashboard/subjects');
                    } catch (e) {
                      toast.error('Failed to delete subject');
                    } finally {
                      setDeleteLoading(false);
                    }
                  }}
                  loading={deleteLoading}
                />
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Fix: Guard against subject being undefined
  const shouldShowExamFeatures = subject
    ? (subject.studyStyle === 'skill'
        ? (typeof subject.showExamFeatures === 'boolean' ? subject.showExamFeatures : false)
        : (typeof subject.showExamFeatures === 'boolean' ? subject.showExamFeatures : true)
      )
    : false;

  // In the main render, after the header and before tabs, show MCAT section info and score input if MCAT
  {subject &&
    ((subject.name && subject.name.toLowerCase().includes('mcat')) ||
    (subject.id && ['cdvFdHpvHOha7SZuOCLS'].includes(subject.id))) && (
    <div className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <Button onClick={() => setScoreDialogOpen(true)} size="sm">Add Section Score</Button>
      </div>
      {/* Score History Chart with tooltips on legend */}
      {scoreHistory.length > 0 && (
        <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} mb-4`}>
          <h3 className="text-xl font-semibold mb-2">Score History</h3>
          <Line
            data={{
              labels: scoreHistory.map(s => s && s.timestamp ? new Date(s.timestamp as string).toLocaleDateString() : ''),
              datasets: [
                { label: 'CPBS', data: scoreHistory.map(s => s.CPBS), borderColor: '#f59e42', backgroundColor: 'rgba(245,158,66,0.2)' },
                { label: 'CARS', data: scoreHistory.map(s => s.CARS), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.2)' },
                { label: 'BBLS', data: scoreHistory.map(s => s.BBLS), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.2)' },
                { label: 'PSBB', data: scoreHistory.map(s => s.PSBB), borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.2)' },
                { label: 'Total', data: scoreHistory.map(s => s.total), borderColor: '#f43f5e', backgroundColor: 'rgba(244,63,94,0.2)', borderDash: [5,5] },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    generateLabels: chart => {
                      const sectionMap = MCAT_SECTIONS.reduce((acc, sec) => {
                        acc[sec.id] = sec;
                        return acc;
                      }, {} as Record<string, typeof MCAT_SECTIONS[number]>);
                      return chart.data.datasets.map((dataset, i) => {
                        return {
                          text: dataset.label ? String(dataset.label) : '',
                          fillStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#888',
                          strokeStyle: typeof dataset.borderColor === 'string' ? dataset.borderColor : '#888',
                          hidden: !chart.isDatasetVisible(i),
                          lineCap: 'butt',
                          lineDash: (dataset as any)?.borderDash || [],
                          lineDashOffset: 0,
                          lineJoin: 'miter',
                          lineWidth: 2,
                          pointStyle: 'line',
                          datasetIndex: i,
                        };
                      }) as import('chart.js').LegendItem[];
                    },
                  },
                  // Custom: show tooltip on hover (handled below)
                },
                // Custom plugin to show shadcn/ui Tooltip on legend hover
                tooltip: {
                  enabled: true,
                  callbacks: {
                    label: function(context) {
                      const label = context.dataset.label || '';
                      const sec = MCAT_SECTIONS.find(s => s.id === label);
                      return sec ? `${label}: ${sec.name} — ${sec.description}` : label;
                    }
                  }
                }
              },
              scales: { y: { min: 110, max: 135 } },
            }}
            height={120}
          />
        </div>
      )}
      {/* Score Input Dialog (unchanged) */}
      <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add MCAT Section Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Test/Source Name</Label>
            <Input name="source" value={scoreForm.source} onChange={handleScoreInput} placeholder="e.g. AAMC FL1, Kaplan FL2, Section Bank, Custom" />
            <Label>Type</Label>
            <Select value={scoreForm.type} onValueChange={handleScoreType}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full-length">Full-length</SelectItem>
                <SelectItem value="section">Section</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-4">
              {MCAT_SECTIONS.map(sec => (
                <div key={sec.id}>
                  <Label>{sec.id}</Label>
                  <Input
                    name={sec.id}
                    type="number"
                    min={118}
                    max={132}
                    value={scoreForm[sec.id as keyof ScoreForm]}
                    onChange={handleScoreInput}
                    placeholder="---"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleScoreSubmit} disabled={scoreLoading} size="sm">Save</Button>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )}

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header Section */}
        <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 ${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
          <div className="flex items-start justify-between w-full">
            <div>
              <h1 className="text-3xl font-bold mb-2">{subject.name}</h1>
              {subject.studyStyle === 'exam' && (
                <span className={`inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${themeStyles.accent}`} style={{ background: 'rgba(59,130,246,0.15)' }}>
                  Exam-based Study
                </span>
              )}
              {subject.studyStyle === 'study' && (
                <span className={`inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${themeStyles.accent}`} style={{ background: 'rgba(16,185,129,0.15)' }}>
                  Study-based
                </span>
              )}
              <p className={themeStyles.textSecondary}>{subject.description}</p>
              {subject.purpose && <p className="mt-2 text-sm text-slate-400 italic">Purpose: {subject.purpose}</p>}
            </div>
            <button
              onClick={setupEditDialog}
              aria-label="Edit Subject Settings"
              className="ml-4 p-2 rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Edit Subject Settings"
            >
              <Settings className="w-6 h-6 text-slate-400 hover:text-blue-400" />
            </button>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <span className={themeStyles.textSecondary}>Mastery:</span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{subject.progress?.averageMastery || 0}%</span>
              </div>
              <div className="flex items-center">
                <span className={themeStyles.textSecondary}>XP:</span>
                <span className={`font-bold ml-2 ${themeStyles.textPrimary}`}>{subject.progress?.totalXP || 0}</span>
              </div>
            </div>
            <div className="w-full max-w-xs mt-2">
              <div className="relative w-full h-4 bg-slate-700/70 rounded-lg border border-slate-600 shadow-sm overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${getProgressBarGradientClass(theme)}`}
                  style={{
                    width: `${subject.progress?.averageMastery || 0}%`,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    borderRadius: '0.5rem',
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
                  }}
                />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white drop-shadow">
                  {subject.progress?.averageMastery || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">Logbook</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="concepts">Concepts/Strategies</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            {/* Overview: Purpose, pinned resources, recent activity/logbook, journal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
                <h2 className="text-xl font-semibold mb-2">Purpose</h2>
                <p className={themeStyles.textSecondary}>{subject.purpose || subject.description}</p>
              </div>
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
                <h2 className="text-xl font-semibold mb-2">Pinned Resources</h2>
                {/* TODO: List pinned resources, allow pin/unpin */}
                <p className={themeStyles.textMuted}>No pinned resources yet.</p>
              </div>
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} col-span-1 md:col-span-2`}>
                <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
                {/* TODO: Show recent sessions/logbook entries */}
                <p className={themeStyles.textMuted}>No recent activity yet.</p>
              </div>
              <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} col-span-1 md:col-span-2`}>
                <h2 className="text-xl font-semibold mb-2">Journal / Reflection</h2>
                {/* TODO: Add journal/reflection area */}
                <p className={themeStyles.textMuted}>No journal entries yet.</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="sessions" className="mt-6">
            {/* TODO: Logbook table/timeline of sessions */}
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
              <h2 className="text-xl font-semibold mb-2">Logbook</h2>
              <p className={themeStyles.textMuted}>No sessions logged yet.</p>
            </div>
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            {/* TODO: All resources, add/edit/categorize/favorite */}
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
              <h2 className="text-xl font-semibold mb-2">Resources</h2>
              <p className={themeStyles.textMuted}>No resources yet.</p>
            </div>
          </TabsContent>
          <TabsContent value="concepts" className="mt-6">
            {/* TODO: Editable list of concepts/strategies */}
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
              <h2 className="text-xl font-semibold mb-2">Concepts & Strategies</h2>
              <p className={themeStyles.textMuted}>No concepts or strategies yet.</p>
            </div>
          </TabsContent>
          <TabsContent value="goals" className="mt-6">
            {/* TODO: Goals/milestones tracking */}
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
              <h2 className="text-xl font-semibold mb-2">Goals & Milestones</h2>
              <p className={themeStyles.textMuted}>No goals or milestones set yet.</p>
            </div>
          </TabsContent>
        </Tabs>
        {/* After analytics/progress cards, before the end of the main container */}
        {shouldShowExamFeatures && (
          <>
            <div className="my-8">
              <h2 className="text-2xl font-bold mb-4">Exam Mode & Review</h2>
              <SubjectReviewDashboard subject={subject} onSync={() => router.refresh()} />
              {/* Placeholder for Quiz/Review section */}
              <div className="mt-6 p-4 rounded-lg bg-slate-800 border border-slate-700">
                <h3 className="text-xl font-semibold mb-2">Quiz & Practice</h3>
                <p className="text-slate-300">(Quiz and practice features go here.)</p>
                </div>
                </div>
            {/* Weak Areas Section */}
            {subject.topics.some(t => t.weakAreas && t.weakAreas.length > 0) && (
              <div className="my-8 p-4 rounded-lg bg-yellow-900/30 border border-yellow-700">
                <h3 className="text-lg font-bold mb-2 text-yellow-300">Weak Areas</h3>
                {subject.topics.filter(t => t.weakAreas && t.weakAreas.length > 0).map(topic => (
                  <div key={topic.name} className="mb-2">
                    <div className="font-semibold text-yellow-200">{topic.name}</div>
                    <ul className="list-disc ml-6 text-yellow-100">
                      {topic.weakAreas.map((area, idx) => (
                        <li key={idx}>{area}</li>
                      ))}
                    </ul>
              </div>
                ))}
              </div>
            )}
          </>
        )}
        {/* Topics List (always show) */}
        <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border} my-8`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Topics</h2>
              <p className={themeStyles.textMuted}>
                {subject.topics.length} topic{subject.topics.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subject.topics.map(topic => {
                const formattedTopicName = topic.name.trim();
                return (
                  <div 
                    key={formattedTopicName} 
                    className={`${themeStyles.topicCard} p-4 rounded-lg transition cursor-pointer ${themeStyles.border}`}
                    onClick={() => {
                      router.push(`/subjects/${subject.id}/topics/${encodeURIComponent(formattedTopicName)}`);
                    }}
                  >
                    <h3 className={`font-semibold mb-2 ${themeStyles.textPrimary}`}>{formattedTopicName}</h3>
                    <p className={`text-sm ${themeStyles.textMuted} mb-3`}>{topic.description}</p>
                    <div className="flex justify-between text-sm">
                      <div>
                        <p className={themeStyles.textMuted}>Mastery</p>
                        <p className={`font-medium ${themeStyles.textPrimary}`}>{topic.masteryLevel}%</p>
                      </div>
                      <div className="text-right">
                        <p className={themeStyles.textMuted}>XP</p>
                        <p className={`font-medium ${themeStyles.textPrimary}`}>{topic.xp}</p>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
                      <div 
                        className={`${themeStyles.progressBar} rounded-full h-1.5`}
                        style={{ width: `${topic.masteryLevel}%` }}
                      />
                    </div>
                  {/* Show weak areas for this topic if present */}
                  {topic.weakAreas && topic.weakAreas.length > 0 && (
                    <div className="mt-2 text-xs text-yellow-200">
                      <strong>Weak Areas:</strong> {topic.weakAreas.join(', ')}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
    </div>
  );
}

function AddTopicButton({ themeStyles, onAdd, subjectId, db, fetchSubject }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  
  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const newTopic = { name, description, masteryLevel: 0, xp: 0, concepts: [], subtopics: [], currentPhase: '', level: 1 };
      const subjectRef = doc(db, 'subjects', subjectId);
      // Atomically add to topics array (fetch, update, save)
      const subjectDoc = await getDoc(subjectRef);
      const data = subjectDoc.data();
      const updatedTopics = [...(data.topics || []), newTopic];
      await updateDoc(subjectRef, { topics: updatedTopics });
      setName(""); setDescription(""); setOpen(false);
              fetchSubject();
    } catch (e) {
      setError('Failed to add topic.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mb-4">
      <button className={`px-4 py-2 rounded ${themeStyles.primary} text-white`} onClick={() => setOpen(true)}>Add Topic</button>
      {open && (
        <div className="mt-2 flex gap-2 items-center">
          <input className="px-2 py-1 rounded border" placeholder="Topic name" value={name} onChange={e => setName(e.target.value)} />
          <input className="px-2 py-1 rounded border" placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <button className={`px-3 py-1 rounded ${themeStyles.primary} text-white`} onClick={handleAdd} disabled={loading}>{loading ? 'Adding...' : 'Add'}</button>
          <button className="px-3 py-1 rounded bg-slate-600 text-white" onClick={() => setOpen(false)} disabled={loading}>Cancel</button>
          {error && <span className="text-red-500 ml-2 text-xs">{error}</span>}
        </div>
      )}
    </div>
  );
}

function RelationalTopicsTable({ topics, subjectId, themeStyles, router, db, fetchSubject }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left py-2 px-3 font-semibold text-sm">Name</th>
            <th className="text-left py-2 px-3 font-semibold text-sm">Type</th>
            <th className="text-left py-2 px-3 font-semibold text-sm">Mastery</th>
            <th className="text-left py-2 px-3 font-semibold text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          <RelationalTopicsRows topics={topics} subjectId={subjectId} themeStyles={themeStyles} router={router} level={0} db={db} fetchSubject={fetchSubject} />
        </tbody>
      </table>
    </div>
  );
}

function RelationalTopicsRows({ topics, subjectId, themeStyles, router, level, db, fetchSubject }) {
  const [expanded, setExpanded] = React.useState(() => ({}));
  const [showAddSubtopic, setShowAddSubtopic] = React.useState({});
  const [showAddConcept, setShowAddConcept] = React.useState({});
  const [subtopicName, setSubtopicName] = React.useState({});
  const [conceptName, setConceptName] = React.useState({});
  const [loading, setLoading] = React.useState({});
  const [error, setError] = React.useState({});
  const [editTopic, setEditTopic] = React.useState({});
  const [editConcept, setEditConcept] = React.useState({});
  const [editTopicValues, setEditTopicValues] = React.useState({});
  const [editConceptValues, setEditConceptValues] = React.useState({});
  const [deleteConfirm, setDeleteConfirm] = React.useState({});

  const toggleExpand = (name) => {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Helper to update nested topics in Firestore
  const updateTopicsInFirestore = async (newTopics) => {
    setLoading(l => ({ ...l, global: true }));
    setError(e => ({ ...e, global: '' }));
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      await updateDoc(subjectRef, { topics: newTopics });
                fetchSubject();
    } catch (e) {
      setError(er => ({ ...er, global: 'Failed to update.' }));
    } finally {
      setLoading(l => ({ ...l, global: false }));
    }
  };

  // Edit topic handler
  const handleEditTopic = async (originalName, values) => {
    setLoading(l => ({ ...l, [originalName + '_edit']: true }));
    setError(e => ({ ...e, [originalName + '_edit']: '' }));
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      const data = subjectDoc.data();
      const updatedTopics = editTopicInTopics(data.topics || [], originalName, values);
      await updateDoc(subjectRef, { topics: updatedTopics });
      setEditTopic(prev => ({ ...prev, [originalName]: false }));
      fetchSubject();
    } catch (e) {
      setError(er => ({ ...er, [originalName + '_edit']: 'Failed to edit topic.' }));
    } finally {
      setLoading(l => ({ ...l, [originalName + '_edit']: false }));
    }
  };
  // Edit concept handler
  const handleEditConcept = async (parentName, originalName, values) => {
    setLoading(l => ({ ...l, [originalName + '_concept_edit']: true }));
    setError(e => ({ ...e, [originalName + '_concept_edit']: '' }));
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      const data = subjectDoc.data();
      const updatedTopics = editConceptInTopics(data.topics || [], parentName, originalName, values);
      await updateDoc(subjectRef, { topics: updatedTopics });
      setEditConcept(prev => ({ ...prev, [originalName]: false }));
      fetchSubject();
    } catch (e) {
      setError(er => ({ ...er, [originalName + '_concept_edit']: 'Failed to edit concept.' }));
    } finally {
      setLoading(l => ({ ...l, [originalName + '_concept_edit']: false }));
    }
  };
  // Delete topic handler
  const handleDeleteTopic = async (name) => {
    setLoading(l => ({ ...l, [name + '_delete']: true }));
    setError(e => ({ ...e, [name + '_delete']: '' }));
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      const data = subjectDoc.data();
      const updatedTopics = deleteTopicFromTopics(data.topics || [], name);
      await updateDoc(subjectRef, { topics: updatedTopics });
      setDeleteConfirm(prev => ({ ...prev, [name]: false }));
      fetchSubject();
    } catch (e) {
      setError(er => ({ ...er, [name + '_delete']: 'Failed to delete topic.' }));
    } finally {
      setLoading(l => ({ ...l, [name + '_delete']: false }));
    }
  };
  // Delete concept handler
  const handleDeleteConcept = async (parentName, name) => {
    setLoading(l => ({ ...l, [name + '_concept_delete']: true }));
    setError(e => ({ ...e, [name + '_concept_delete']: '' }));
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subjectDoc = await getDoc(subjectRef);
      const data = subjectDoc.data();
      const updatedTopics = deleteConceptFromTopics(data.topics || [], parentName, name);
      await updateDoc(subjectRef, { topics: updatedTopics });
      setDeleteConfirm(prev => ({ ...prev, [name + '_concept']: false }));
      fetchSubject();
    } catch (e) {
      setError(er => ({ ...er, [name + '_concept_delete']: 'Failed to delete concept.' }));
    } finally {
      setLoading(l => ({ ...l, [name + '_concept_delete']: false }));
    }
  };

  if (!topics || topics.length === 0) {
    return (
      <tr>
        <td colSpan={4} className={`py-3 px-3 ${themeStyles.textMuted}`}>No topics or concepts found.</td>
      </tr>
    );
  }

  return (
    <>
      {topics.map((topic, idx) => {
        const hasChildren = (topic.subtopics && topic.subtopics.length > 0) || (topic.concepts && topic.concepts.length > 0);
        return (
          <React.Fragment key={topic.name}>
            <tr className={`border-b border-slate-700 hover:${themeStyles.secondary} transition`}>
              <td className="py-2 px-3">
                <div className="flex items-center" style={{ marginLeft: level * 16 }}>
                  {hasChildren && (
                    <button
                      className={`mr-2 text-xs px-2 py-1 rounded ${themeStyles.secondary} ${themeStyles.accent}`}
                      onClick={() => toggleExpand(topic.name)}
                      type="button"
                    >
                      {expanded[topic.name] ? '-' : '+'}
                    </button>
                  )}
                  {editTopic[topic.name] ? (
                    <>
                      <input className="px-2 py-1 rounded border mr-2" value={editTopicValues[topic.name]?.name || topic.name} onChange={e => setEditTopicValues(v => ({ ...v, [topic.name]: { ...v[topic.name], name: e.target.value } }))} />
                      <input className="px-2 py-1 rounded border mr-2" value={editTopicValues[topic.name]?.description || topic.description || ''} onChange={e => setEditTopicValues(v => ({ ...v, [topic.name]: { ...v[topic.name], description: e.target.value } }))} />
                      <button className={`px-2 py-1 rounded ${themeStyles.primary} text-white mr-1`} onClick={() => handleEditTopic(topic.name, { ...topic, ...editTopicValues[topic.name] })} disabled={loading[topic.name + '_edit']}>{loading[topic.name + '_edit'] ? 'Saving...' : 'Save'}</button>
                      <button className="px-2 py-1 rounded bg-slate-600 text-white" onClick={() => setEditTopic(prev => ({ ...prev, [topic.name]: false }))} disabled={loading[topic.name + '_edit']}>Cancel</button>
                      {error[topic.name + '_edit'] && <span className="text-red-500 ml-2 text-xs">{error[topic.name + '_edit']}</span>}
                    </>
                  ) : (
                    <span className={`font-semibold cursor-pointer ${themeStyles.textPrimary} hover:underline`} onClick={() => router.push(`/subjects/${subjectId}/topics/${encodeURIComponent(topic.name)}`)}>{topic.name}</span>
                  )}
          </div>
              </td>
              <td className="py-2 px-3">Topic</td>
              <td className="py-2 px-3">{topic.masteryLevel || 0}%</td>
              <td className="py-2 px-3 flex gap-2">
                <button className={`text-xs px-2 py-1 rounded ${themeStyles.primary} text-white`} onClick={() => router.push(`/subjects/${subjectId}/topics/${encodeURIComponent(topic.name)}`)}>View</button>
                <button className={`text-xs px-2 py-1 rounded ${themeStyles.secondary} ${themeStyles.accent}`} onClick={() => setShowAddSubtopic(prev => ({ ...prev, [topic.name]: !prev[topic.name] }))}>Add Subtopic</button>
                <button className={`text-xs px-2 py-1 rounded ${themeStyles.secondary} ${themeStyles.accent}`} onClick={() => setShowAddConcept(prev => ({ ...prev, [topic.name]: !prev[topic.name] }))}>Add Concept</button>
                <button className={`text-xs px-2 py-1 rounded bg-yellow-600 text-white`} onClick={() => { setEditTopicValues(v => ({ ...v, [topic.name]: { name: topic.name, description: topic.description || '' } })); setEditTopic(prev => ({ ...prev, [topic.name]: true })); }}>Edit</button>
                <button className={`text-xs px-2 py-1 rounded bg-red-600 text-white`} onClick={() => setDeleteConfirm(prev => ({ ...prev, [topic.name]: true }))}>Delete</button>
                {deleteConfirm[topic.name] && (
                  <span className="ml-2">
                    Confirm? <button className="text-xs px-2 py-1 rounded bg-red-700 text-white" onClick={() => handleDeleteTopic(topic.name)} disabled={loading[topic.name + '_delete']}>{loading[topic.name + '_delete'] ? 'Deleting...' : 'Yes'}</button> <button className="text-xs px-2 py-1 rounded bg-slate-600 text-white" onClick={() => setDeleteConfirm(prev => ({ ...prev, [topic.name]: false }))} disabled={loading[topic.name + '_delete']}>No</button>
                    {error[topic.name + '_delete'] && <span className="text-red-500 ml-2 text-xs">{error[topic.name + '_delete']}</span>}
                  </span>
                )}
              </td>
            </tr>
            {/* Add Subtopic Inline Form */}
            {showAddSubtopic[topic.name] && (
              <tr>
                <td colSpan={4} className="py-2 px-3">
                  <div className="flex gap-2 items-center ml-8">
                    <input className="px-2 py-1 rounded border" placeholder="Subtopic name" value={subtopicName[topic.name] || ''} onChange={e => setSubtopicName(prev => ({ ...prev, [topic.name]: e.target.value }))} />
                    <button className={`px-3 py-1 rounded ${themeStyles.primary} text-white`} onClick={async () => {
                      if ((subtopicName[topic.name] || '').trim()) {
                        setLoading(l => ({ ...l, [topic.name + '_subtopic']: true }));
                        setError(e => ({ ...e, [topic.name + '_subtopic']: '' }));
                        try {
                          // Fetch latest topics, add subtopic, update
                          const subjectRef = doc(db, 'subjects', subjectId);
                          const subjectDoc = await getDoc(subjectRef);
                          const data = subjectDoc.data();
                          const updatedTopics = addSubtopicToTopics(data.topics || [], topic.name, { name: subtopicName[topic.name], masteryLevel: 0, xp: 0, concepts: [], subtopics: [], currentPhase: '', level: 1 });
                          await updateDoc(subjectRef, { topics: updatedTopics });
                          setSubtopicName(prev => ({ ...prev, [topic.name]: '' }));
                          setShowAddSubtopic(prev => ({ ...prev, [topic.name]: false }));
                          fetchSubject();
                        } catch (e) {
                          setError(er => ({ ...er, [topic.name + '_subtopic']: 'Failed to add subtopic.' }));
                        } finally {
                          setLoading(l => ({ ...l, [topic.name + '_subtopic']: false }));
                        }
                      }
                    }} disabled={loading[topic.name + '_subtopic']}>{loading[topic.name + '_subtopic'] ? 'Adding...' : 'Add'}</button>
                    <button className="px-3 py-1 rounded bg-slate-600 text-white" onClick={() => setShowAddSubtopic(prev => ({ ...prev, [topic.name]: false }))} disabled={loading[topic.name + '_subtopic']}>Cancel</button>
                    {error[topic.name + '_subtopic'] && <span className="text-red-500 ml-2 text-xs">{error[topic.name + '_subtopic']}</span>}
      </div>
                </td>
              </tr>
            )}
            {/* Add Concept Inline Form */}
            {showAddConcept[topic.name] && (
              <tr>
                <td colSpan={4} className="py-2 px-3">
                  <div className="flex gap-2 items-center ml-8">
                    <input className="px-2 py-1 rounded border" placeholder="Concept name" value={conceptName[topic.name] || ''} onChange={e => setConceptName(prev => ({ ...prev, [topic.name]: e.target.value }))} />
                    <button className={`px-3 py-1 rounded ${themeStyles.primary} text-white`} onClick={async () => {
                      if ((conceptName[topic.name] || '').trim()) {
                        setLoading(l => ({ ...l, [topic.name + '_concept']: true }));
                        setError(e => ({ ...e, [topic.name + '_concept']: '' }));
                        try {
                          // Fetch latest topics, add concept, update
                          const subjectRef = doc(db, 'subjects', subjectId);
                          const subjectDoc = await getDoc(subjectRef);
                          const data = subjectDoc.data();
                          const updatedTopics = addConceptToTopics(data.topics || [], topic.name, { name: conceptName[topic.name], masteryLevel: 0 });
                          await updateDoc(subjectRef, { topics: updatedTopics });
                          setConceptName(prev => ({ ...prev, [topic.name]: '' }));
                          setShowAddConcept(prev => ({ ...prev, [topic.name]: false }));
                          fetchSubject();
                        } catch (e) {
                          setError(er => ({ ...er, [topic.name + '_concept']: 'Failed to add concept.' }));
                        } finally {
                          setLoading(l => ({ ...l, [topic.name + '_concept']: false }));
                        }
                      }
                    }} disabled={loading[topic.name + '_concept']}>{loading[topic.name + '_concept'] ? 'Adding...' : 'Add'}</button>
                    <button className="px-3 py-1 rounded bg-slate-600 text-white" onClick={() => setShowAddConcept(prev => ({ ...prev, [topic.name]: false }))} disabled={loading[topic.name + '_concept']}>Cancel</button>
                    {error[topic.name + '_concept'] && <span className="text-red-500 ml-2 text-xs">{error[topic.name + '_concept']}</span>}
    </div>
                </td>
              </tr>
            )}
            {/* Only render children if expanded */}
            {hasChildren && expanded[topic.name] && (
              <>
                {topic.concepts && topic.concepts.length > 0 && topic.concepts.map((concept) => (
                  <tr key={concept.name} className={`border-b border-slate-800 hover:${themeStyles.secondary} transition`}>
                    <td className="py-2 px-3">
                      <div className="flex items-center" style={{ marginLeft: (level + 1) * 16 }}>
                        {editConcept[concept.name] ? (
                          <>
                            <input className="px-2 py-1 rounded border mr-2" value={editConceptValues[concept.name]?.name || concept.name} onChange={e => setEditConceptValues(v => ({ ...v, [concept.name]: { ...v[concept.name], name: e.target.value } }))} />
                            <button className={`px-2 py-1 rounded ${themeStyles.primary} text-white mr-1`} onClick={() => handleEditConcept(topic.name, concept.name, { ...concept, ...editConceptValues[concept.name] })} disabled={loading[concept.name + '_concept_edit']}>{loading[concept.name + '_concept_edit'] ? 'Saving...' : 'Save'}</button>
                            <button className="px-2 py-1 rounded bg-slate-600 text-white" onClick={() => setEditConcept(prev => ({ ...prev, [concept.name]: false }))} disabled={loading[concept.name + '_concept_edit']}>Cancel</button>
                            {error[concept.name + '_concept_edit'] && <span className="text-red-500 ml-2 text-xs">{error[concept.name + '_concept_edit']}</span>}
                          </>
                        ) : (
                          <span className={`font-medium cursor-pointer ${themeStyles.textSecondary} hover:underline`}>{concept.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">Concept</td>
                    <td className="py-2 px-3">{concept.masteryLevel || 0}%</td>
                    <td className="py-2 px-3 flex gap-2">
                      <button className={`text-xs px-2 py-1 rounded bg-yellow-600 text-white`} onClick={() => { setEditConceptValues(v => ({ ...v, [concept.name]: { name: concept.name } })); setEditConcept(prev => ({ ...prev, [concept.name]: true })); }}>Edit</button>
                      <button className={`text-xs px-2 py-1 rounded bg-red-600 text-white`} onClick={() => setDeleteConfirm(prev => ({ ...prev, [concept.name + '_concept']: true }))}>Delete</button>
                      {deleteConfirm[concept.name + '_concept'] && (
                        <span className="ml-2">
                          Confirm? <button className="text-xs px-2 py-1 rounded bg-red-700 text-white" onClick={() => handleDeleteConcept(topic.name, concept.name)} disabled={loading[concept.name + '_concept_delete']}>{loading[concept.name + '_concept_delete'] ? 'Deleting...' : 'Yes'}</button> <button className="text-xs px-2 py-1 rounded bg-slate-600 text-white" onClick={() => setDeleteConfirm(prev => ({ ...prev, [concept.name + '_concept']: false }))} disabled={loading[concept.name + '_concept_delete']}>No</button>
                          {error[concept.name + '_concept_delete'] && <span className="text-red-500 ml-2 text-xs">{error[concept.name + '_concept_delete']}</span>}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {topic.subtopics && topic.subtopics.length > 0 && (
                  <RelationalTopicsRows
                    topics={topic.subtopics}
                    subjectId={subjectId}
                    themeStyles={themeStyles}
                    router={router}
                    level={level + 1}
                    db={db}
                    fetchSubject={fetchSubject}
                  />
                )}
              </>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

// Helper functions to update nested topics/concepts in state
function addSubtopicToTopics(topics, parentName, subtopic) {
  return topics.map(topic => {
    if (topic.name === parentName) {
      return { ...topic, subtopics: [...(topic.subtopics || []), subtopic] };
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      return { ...topic, subtopics: addSubtopicToTopics(topic.subtopics, parentName, subtopic) };
    } else {
      return topic;
    }
  });
}
function addConceptToTopics(topics, parentName, concept) {
  return topics.map(topic => {
    if (topic.name === parentName) {
      return { ...topic, concepts: [...(topic.concepts || []), concept] };
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      return { ...topic, subtopics: addConceptToTopics(topic.subtopics, parentName, concept) };
    } else {
      return topic;
    }
  });
}
// Edit topic in nested topics
function editTopicInTopics(topics, originalName, values) {
  return topics.map(topic => {
    if (topic.name === originalName) {
      return { ...topic, ...values };
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      return { ...topic, subtopics: editTopicInTopics(topic.subtopics, originalName, values) };
    } else {
      return topic;
    }
  });
}
// Edit concept in nested topics
function editConceptInTopics(topics, parentName, originalName, values) {
  return topics.map(topic => {
    if (topic.name === parentName) {
      return { ...topic, concepts: topic.concepts.map(c => c.name === originalName ? { ...c, ...values } : c) };
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      return { ...topic, subtopics: editConceptInTopics(topic.subtopics, parentName, originalName, values) };
    } else {
      return topic;
    }
  });
}
// Delete topic from nested topics
function deleteTopicFromTopics(topics, name) {
  return topics.filter(topic => topic.name !== name).map(topic => ({
    ...topic,
    subtopics: topic.subtopics ? deleteTopicFromTopics(topic.subtopics, name) : [],
  }));
}
// Delete concept from nested topics
function deleteConceptFromTopics(topics, parentName, name) {
  return topics.map(topic => {
    if (topic.name === parentName) {
      return { ...topic, concepts: topic.concepts.filter(c => c.name !== name) };
    } else if (topic.subtopics && topic.subtopics.length > 0) {
      return { ...topic, subtopics: deleteConceptFromTopics(topic.subtopics, parentName, name) };
    } else {
      return topic;
    }
  });
}

// Add ArchiveDeleteButtons component at the bottom of the file
function ArchiveDeleteButtons({ subjectId, archived, onArchive, onDelete, loading }) {
  return (
    <>
      <Button
        variant="secondary"
        className="bg-yellow-900/80 text-yellow-300 border-yellow-700 hover:bg-yellow-800 hover:text-yellow-100"
        onClick={onArchive}
        disabled={archived || loading}
        size="sm"
      >
        {archived ? 'Archived' : 'Archive Subject'}
      </Button>
      <Button
        variant="destructive"
        onClick={onDelete}
        disabled={loading}
        size="sm"
      >
        Delete Subject
      </Button>
    </>
  );
} 
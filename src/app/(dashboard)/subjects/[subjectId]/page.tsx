"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import type { Subject } from "@/types/study";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
// Import icons individually
import { Loader2 } from "lucide-react";
import { Plus } from "lucide-react";
import { Download } from "lucide-react";
import { FileText } from "lucide-react";
import { Sync } from "lucide-react";
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
}

interface PageProps {
  params: { subjectId: string };
}

export default function SubjectDetailsPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const subjectId = decodeURIComponent(unwrappedParams.subjectId);
  
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
        subjectId: subject.id,
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
        subjectId: subject.id,
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
      
      // Update local state
      setSubject({
        ...subject,
        name: editedName,
        description: editedDescription,
        studyStyle: editedStudyStyle
      });
      
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

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link 
              href="/subjects"
              className={`${themeStyles.accent} hover:underline transition mb-2 inline-block`}
            >
              ← Back to Subjects
            </Link>
            <h1 className="text-3xl font-bold">{subject.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/subjects/${subject.id}/topics/new`)}
              className={`flex items-center gap-2 px-4 py-2 ${themeStyles.primary} text-white rounded-lg transition`}
            >
              <Plus className="h-5 w-5" />
              Add Topic
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 px-4 py-2 ${themeStyles.secondary} text-white rounded-lg hover:${themeStyles.buttonHover} transition`}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`w-56 ${themeStyles.cardBg} ${themeStyles.border} text-white`}>
                <DropdownMenuItem 
                  className={`hover:bg-slate-700/70 cursor-pointer flex items-center gap-2 ${themeStyles.textPrimary}`}
                  onClick={setupEditDialog}
                >
                  <Pencil className="h-4 w-4" />
                  Edit Subject
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className={themeStyles.border} />
                
                <DropdownMenuItem 
                  className={`hover:bg-slate-700/70 cursor-pointer flex items-center gap-2 ${themeStyles.textPrimary}`}
                  onClick={() => setSyncDialogOpen(true)}
                >
                  <CustomSyncIcon className="h-4 w-4" />
                  Sync Subject
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className={`hover:bg-slate-700/70 cursor-pointer flex items-center gap-2 ${themeStyles.textPrimary}`}
                  onClick={() => handleExportToNotion()}
                >
                  <FileText className="h-4 w-4" />
                  Export to Notion
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  className={`hover:bg-slate-700/70 cursor-pointer flex items-center gap-2 ${themeStyles.textPrimary}`}
                  onClick={() => handleExportToObsidian()}
                >
                  <Download className="h-4 w-4" />
                  Export to Obsidian
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className={themeStyles.border} />
                
                <DropdownMenuItem 
                  className="text-red-300 hover:bg-red-900/40 hover:text-red-200 cursor-pointer flex items-center gap-2"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash className="h-4 w-4" />
                  Delete Subject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
              <DialogContent className={`sm:max-w-[425px] ${themeStyles.cardBg} ${themeStyles.border}`}>
                <DialogHeader>
                  <DialogTitle className={themeStyles.textPrimary}>Sync Subject</DialogTitle>
                  <DialogDescription className={themeStyles.textMuted}>
                    Sync this subject with Notion or Obsidian.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="sync-target" className={themeStyles.textSecondary}>Sync Target</Label>
                    <Select
                      value={syncTarget}
                      onValueChange={(value: 'notion' | 'obsidian') => {
                        setSyncTarget(value);
                        setSelectedFile(null);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sync target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="notion">Notion</SelectItem>
                        <SelectItem value="obsidian">Obsidian</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="sync-direction" className={themeStyles.textSecondary}>Sync Direction</Label>
                    <Select
                      value={syncDirection}
                      onValueChange={(value: 'push' | 'pull' | 'both') => setSyncDirection(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sync direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="push">Push to {syncTarget === 'notion' ? 'Notion' : 'Obsidian'}</SelectItem>
                        <SelectItem value="pull">Pull from {syncTarget === 'notion' ? 'Notion' : 'Obsidian'}</SelectItem>
                        <SelectItem value="both">Bi-directional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {syncTarget === 'obsidian' && (syncDirection === 'pull' || syncDirection === 'both') && (
                    <div>
                      <Label htmlFor="obsidian-file" className={themeStyles.textSecondary}>Obsidian Vault File</Label>
                      <div className="mt-2">
                        <input
                          id="obsidian-file"
                          type="file"
                          accept=".md,.zip"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="conflict-resolution" className={themeStyles.textSecondary}>Conflict Resolution</Label>
                    <Select
                      value={conflictResolution}
                      onValueChange={(value: 'local' | 'external' | 'manual' | 'newest') => setConflictResolution(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select conflict resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Prefer App Version</SelectItem>
                        <SelectItem value="external">Prefer External Version</SelectItem>
                        <SelectItem value="newest">Use Newest Version</SelectItem>
                        <SelectItem value="manual">Manual Resolution</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-progress" className={themeStyles.textSecondary}>Include Progress Data</Label>
                    <Switch
                      id="include-progress"
                      checked={includeProgress}
                      onCheckedChange={setIncludeProgress}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-spaced-repetition" className={themeStyles.textSecondary}>Include Spaced Repetition Info</Label>
                    <Switch
                      id="include-spaced-repetition"
                      checked={includeSpacedRepetitionInfo}
                      onCheckedChange={setIncludeSpacedRepetitionInfo}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    className={themeStyles.primary}
                    onClick={syncTarget === 'notion' ? handleSyncWithNotion : handleSyncWithObsidian}
                    disabled={syncLoading || (syncTarget === 'obsidian' && (syncDirection === 'pull' || syncDirection === 'both') && !selectedFile)}
                  >
                    {syncLoading ? 'Syncing...' : `Sync with ${syncTarget === 'notion' ? 'Notion' : 'Obsidian'}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className={`sm:max-w-[425px] ${themeStyles.cardBg} ${themeStyles.border}`}>
                <DialogHeader>
                  <DialogTitle className={themeStyles.textPrimary}>Delete Subject</DialogTitle>
                  <DialogDescription className={themeStyles.textMuted}>
                    Are you sure you want to delete this subject? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteSubject}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Subject'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent className={`sm:max-w-[425px] ${themeStyles.cardBg} ${themeStyles.border}`}>
                <DialogHeader>
                  <DialogTitle className={themeStyles.textPrimary}>Edit Subject</DialogTitle>
                  <DialogDescription className={themeStyles.textMuted}>
                    Update your subject details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label htmlFor="subject-name" className={themeStyles.textSecondary}>Subject Name</Label>
                    <Input
                      id="subject-name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className={`mt-1 bg-slate-800 ${themeStyles.border} text-white`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="study-style" className={themeStyles.textSecondary}>Study Style</Label>
                    <Input
                      id="study-style"
                      value={editedStudyStyle}
                      onChange={(e) => setEditedStudyStyle(e.target.value)}
                      className={`mt-1 bg-slate-800 ${themeStyles.border} text-white`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject-description" className={themeStyles.textSecondary}>Description</Label>
                    <textarea
                      id="subject-description"
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      className={`w-full mt-1 p-2 rounded-md border bg-slate-800 text-white ${themeStyles.border}`}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleEditSubject}
                    disabled={isEditing}
                    className={themeStyles.primary}
                  >
                    {isEditing ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="hidden">
            Debug Progress: {JSON.stringify(subject?.progress)}
          </div>
          
          <SubjectAnalytics 
            subjectId={unwrappedParams.subjectId} 
            topics={subject.topics}
            progress={subject.progress}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div 
              className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}
              onClick={() => {
                console.log('Progress Card Values:', {
                  level: subject.level,
                  xp: subject.xp,
                  masteryPath: subject.masteryPath,
                  calculatedXP: subject.topics.reduce((sum, t) => sum + (t.xp || 0), 0),
                  topicsXP: subject.topics.map(t => ({ name: t.name, xp: t.xp })),
                  progress: subject.progress
                });
              }}
            >
              <h2 className="text-xl font-semibold mb-4">Progress</h2>
              <div className="flex justify-between mb-4">
                <div>
                  {theme === 'dbz' ? (
                    <>
                      <p className="text-sm text-yellow-400 font-bold">Power Level</p>
                      <p className="text-2xl font-bold text-yellow-300">{getDbzPowerLevel(subject.xp).toLocaleString()}</p>
                      <p className="text-xs font-bold text-yellow-200 mt-1">{getDbzMilestone(getDbzPowerLevel(subject.xp))}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-slate-400">Level</p>
                      <p className="text-2xl font-bold">{subject.level}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">XP</p>
                  <p className="text-2xl font-bold">{subject.xp}</p>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className={`${themeStyles.progressBar} rounded-full h-2 transition-all duration-500`}
                  style={{ width: `${subject.masteryPath.progress}%` }}
                />
              </div>
              <p className={`text-sm ${themeStyles.textMuted} mt-2`}>
                {subject.masteryPath.progress}% progress to level {subject.masteryPath.nextLevel}
              </p>
            </div>
            
            <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg lg:col-span-2 ${themeStyles.border}`}>
              <h2 className="text-xl font-semibold mb-4">Study Style</h2>
              <p className={themeStyles.textSecondary}>{subject.studyStyle}</p>
              <p className={`${themeStyles.textMuted} mt-4`}>{subject.description}</p>
            </div>
          </div>

          <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
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
                      console.log('Navigating to topic:', formattedTopicName);
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className={`text-2xl font-bold ${themeStyles.accent}`}>{themeStyles.header}</h1>
          <MigrationButton 
            subjectId={unwrappedParams.subjectId} 
            onMigrationComplete={() => {
              // Refresh the subject data after migration
              fetchSubject();
            }}
          />
        </div>

        {subject && (
          <div className="grid gap-8">
            <SubjectReviewDashboard 
              subject={subject} 
              onSync={() => {
                router.refresh();
              }} 
            />
            
            <ExamModeSettings
              subject={subject}
              onUpdate={() => {
                fetchSubject();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
} 
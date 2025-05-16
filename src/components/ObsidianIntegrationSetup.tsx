import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { ObsidianSyncOptions } from '@/types/sync';

export default function ObsidianIntegrationSetup() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('import');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | 'both'>('both');
  const [conflictResolution, setConflictResolution] = useState<'local' | 'external' | 'manual' | 'newest'>('newest');
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeSpacedRepetitionInfo, setIncludeSpacedRepetitionInfo] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [structureType, setStructureType] = useState<'folders' | 'tags' | 'frontmatter'>('folders');
  const [vaultPath, setVaultPath] = useState<string>('');

  // Fetch subjects on component mount
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const response = await fetch('/api/subjects');
        const data = await response.json();
        
        if (data.subjects) {
          setSubjects(data.subjects.map(subject => ({
            id: subject.id,
            name: subject.name
          })));
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      }
    };

    fetchSubjects();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      formData.append('files', selectedFile);
      formData.append('options', JSON.stringify({
        recursive: true,
        filePattern: '*.md',
        structureType,
        mappings: {}
      }));

      const response = await fetch('/api/integrations/obsidian/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to import from Obsidian');
      }

      const data = await response.json();
      toast.success('Successfully imported from Obsidian!');
      
      // Reset the file input
      setSelectedFile(null);
      const fileInput = document.getElementById('obsidian-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Error importing from Obsidian:', error);
      toast.error('Failed to import from Obsidian. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject to export');
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch('/api/integrations/obsidian/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subjectId: selectedSubject,
          format: 'markdown',
          includeProgress,
          includeSpacedRepetitionInfo
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
      
      // Get the subject name for the filename
      const subject = subjects.find(s => s.id === selectedSubject);
      const filename = subject ? subject.name : 'obsidian-export';
      a.download = `${filename.replace(/[/\\?%*:|"<>]/g, '-')}.zip`;
      
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
    } finally {
      setIsExporting(false);
    }
  };

  const handleSync = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject to sync');
      return;
    }

    if (syncDirection === 'pull' || syncDirection === 'both') {
      if (!selectedFile) {
        toast.error('Please select a file to sync from Obsidian');
        return;
      }
    }

    setSyncLoading(true);

    try {
      const syncOptions: ObsidianSyncOptions = {
        subjectId: selectedSubject,
        direction: syncDirection,
        conflictResolution,
        includeProgress,
        includeSpacedRepetitionInfo,
        syncSubjects: true,
        syncTopics: true,
        syncConcepts: true,
        vaultPath: vaultPath || 'default',
        structureType
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
        
        // Get the subject name for the filename
        const subject = subjects.find(s => s.id === selectedSubject);
        const filename = subject ? subject.name : 'obsidian-sync';
        a.download = `${filename.replace(/[/\\?%*:|"<>]/g, '-')}.zip`;
        
        // Append to the document and trigger the download
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Successfully pushed to Obsidian!');
      } else {
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
        } else {
          toast.error('Sync failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error syncing with Obsidian:', error);
      toast.error('Failed to sync with Obsidian. Please try again.');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Obsidian Integration</CardTitle>
        <CardDescription>
          Import, export, and sync study materials to and from Obsidian.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="sync">Sync</TabsTrigger>
          </TabsList>
          
          <TabsContent value="import">
            <div className="space-y-4">
              <div>
                <Label htmlFor="obsidian-file">Import from Obsidian</Label>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Select a Markdown file or a ZIP of your Obsidian vault
                  </p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="structure-type">Structure Type</Label>
                <Select
                  value={structureType}
                  onValueChange={(value: 'folders' | 'tags' | 'frontmatter') => setStructureType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select structure type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folders">Folders</SelectItem>
                    <SelectItem value="tags">Tags</SelectItem>
                    <SelectItem value="frontmatter">Frontmatter</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  How to organize the imported content
                </p>
              </div>
              
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !selectedFile}
                className="w-full"
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="export">
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-select">Select Subject to Export</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-progress-export">Include Progress Data</Label>
                <Switch
                  id="include-progress-export"
                  checked={includeProgress}
                  onCheckedChange={setIncludeProgress}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-spaced-repetition-export">Include Spaced Repetition Info</Label>
                <Switch
                  id="include-spaced-repetition-export"
                  checked={includeSpacedRepetitionInfo}
                  onCheckedChange={setIncludeSpacedRepetitionInfo}
                />
              </div>
              
              <Button 
                onClick={handleExport}
                disabled={isExporting || !selectedSubject}
                className="w-full"
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="sync">
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-select-sync">Select Subject to Sync</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="sync-direction">Sync Direction</Label>
                <Select
                  value={syncDirection}
                  onValueChange={(value: 'push' | 'pull' | 'both') => setSyncDirection(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sync direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="push">Push to Obsidian</SelectItem>
                    <SelectItem value="pull">Pull from Obsidian</SelectItem>
                    <SelectItem value="both">Bi-directional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Push: Update Obsidian with your app data. Pull: Update app with Obsidian data.
                </p>
              </div>
              
              {(syncDirection === 'pull' || syncDirection === 'both') && (
                <div>
                  <Label htmlFor="obsidian-file-sync">Obsidian Vault File</Label>
                  <div className="mt-2">
                    <input
                      id="obsidian-file-sync"
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
                    <p className="text-xs text-gray-500 mt-1">
                      Select a ZIP of your Obsidian vault for syncing
                    </p>
                  </div>
                </div>
              )}
              
              <div>
                <Label htmlFor="conflict-resolution">Conflict Resolution</Label>
                <Select
                  value={conflictResolution}
                  onValueChange={(value: 'local' | 'external' | 'manual' | 'newest') => setConflictResolution(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select conflict resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Prefer App Version</SelectItem>
                    <SelectItem value="external">Prefer Obsidian Version</SelectItem>
                    <SelectItem value="newest">Use Newest Version</SelectItem>
                    <SelectItem value="manual">Manual Resolution</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  How to handle conflicts when both versions have changed.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-progress-sync">Include Progress Data</Label>
                <Switch
                  id="include-progress-sync"
                  checked={includeProgress}
                  onCheckedChange={setIncludeProgress}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-spaced-repetition-sync">Include Spaced Repetition Info</Label>
                <Switch
                  id="include-spaced-repetition-sync"
                  checked={includeSpacedRepetitionInfo}
                  onCheckedChange={setIncludeSpacedRepetitionInfo}
                />
              </div>
              
              <Button 
                onClick={handleSync}
                disabled={syncLoading || !selectedSubject || ((syncDirection === 'pull' || syncDirection === 'both') && !selectedFile)}
                className="w-full"
              >
                {syncLoading ? 'Syncing...' : 'Sync with Obsidian'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 
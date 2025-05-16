import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { saveNotionConnection } from '@/utils/notionClient';
import { auth } from '@/lib/firebase';
import { NotionSyncOptions } from '@/types/sync';

export default function NotionIntegrationSetup() {
  const [accessToken, setAccessToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('connect');
  const [syncDirection, setSyncDirection] = useState<'push' | 'pull' | 'both'>('both');
  const [conflictResolution, setConflictResolution] = useState<'local' | 'external' | 'manual' | 'newest'>('newest');
  const [includeProgress, setIncludeProgress] = useState(true);
  const [includeSpacedRepetitionInfo, setIncludeSpacedRepetitionInfo] = useState(true);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Check if user has a Notion connection
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const response = await fetch('/api/integrations/notion/check-connection');
        const data = await response.json();
        
        if (data.connected) {
          setConnected(true);
          setWorkspaceName(data.workspaceName || 'Your Notion Workspace');
        }
      } catch (error) {
        console.error('Error checking Notion connection:', error);
      }
    };

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

    checkConnection();
    fetchSubjects();
  }, []);

  const handleConnect = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter a valid access token');
      return;
    }

    setLoading(true);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        toast.error('You must be logged in to connect to Notion');
        setLoading(false);
        return;
      }

      // Test the token by making a simple API call
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Notion-Version': '2022-06-28',
        },
      });

      if (!response.ok) {
        toast.error('Invalid Notion token. Please check and try again.');
        setLoading(false);
        return;
      }

      const userData = await response.json();

      // Save the connection
      await saveNotionConnection({
        accessToken,
        workspaceId: userData.bot?.workspace_id || '',
        workspaceName: userData.bot?.workspace_name || 'Notion Workspace',
        botId: userData.bot?.id || '',
        userId,
      });

      setConnected(true);
      setWorkspaceName(userData.bot?.workspace_name || 'Your Notion Workspace');
      toast.success('Successfully connected to Notion!');
      setActiveTab('sync');
    } catch (error) {
      console.error('Error connecting to Notion:', error);
      toast.error('Failed to connect to Notion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        toast.error('You must be logged in to disconnect from Notion');
        setLoading(false);
        return;
      }

      await fetch('/api/integrations/notion/disconnect', {
        method: 'POST',
      });

      setConnected(false);
      setWorkspaceName('');
      setAccessToken('');
      toast.success('Successfully disconnected from Notion');
      setActiveTab('connect');
    } catch (error) {
      console.error('Error disconnecting from Notion:', error);
      toast.error('Failed to disconnect from Notion. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject to sync');
      return;
    }

    setSyncLoading(true);

    try {
      const syncOptions: NotionSyncOptions = {
        subjectId: selectedSubject,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notion Integration</CardTitle>
        <CardDescription>
          Connect your Notion workspace to import, export, and sync study materials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="connect">Connection</TabsTrigger>
            <TabsTrigger value="sync" disabled={!connected}>Sync Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="connect">
            {connected ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Connected to {workspaceName}</p>
                    <p className="text-sm text-gray-500">Your Notion integration is working</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notion-token">Notion Integration Token</Label>
                  <Input
                    id="notion-token"
                    type="password"
                    placeholder="Enter your Notion integration token"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    You can create a new integration token at{' '}
                    <a
                      href="https://www.notion.so/my-integrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      notion.so/my-integrations
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    After creating your integration, you'll need to share specific pages or databases with it in Notion.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="sync">
            <div className="space-y-4">
              <div>
                <Label htmlFor="subject-select">Select Subject to Sync</Label>
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
                    <SelectItem value="push">Push to Notion</SelectItem>
                    <SelectItem value="pull">Pull from Notion</SelectItem>
                    <SelectItem value="both">Bi-directional</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Push: Update Notion with your app data. Pull: Update app with Notion data.
                </p>
              </div>
              
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
                    <SelectItem value="external">Prefer Notion Version</SelectItem>
                    <SelectItem value="newest">Use Newest Version</SelectItem>
                    <SelectItem value="manual">Manual Resolution</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  How to handle conflicts when both versions have changed.
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-progress">Include Progress Data</Label>
                <Switch
                  id="include-progress"
                  checked={includeProgress}
                  onCheckedChange={setIncludeProgress}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-spaced-repetition">Include Spaced Repetition Info</Label>
                <Switch
                  id="include-spaced-repetition"
                  checked={includeSpacedRepetitionInfo}
                  onCheckedChange={setIncludeSpacedRepetitionInfo}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        {activeTab === 'connect' ? (
          connected ? (
            <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
              {loading ? 'Disconnecting...' : 'Disconnect from Notion'}
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect to Notion'}
            </Button>
          )
        ) : (
          <Button onClick={handleSync} disabled={syncLoading || !selectedSubject}>
            {syncLoading ? 'Syncing...' : 'Sync with Notion'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 
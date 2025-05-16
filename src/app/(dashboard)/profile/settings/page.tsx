"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { ThemedHeader, ThemedCard, ThemeSelector } from "@/components/ui/themed-components";
import { useTheme } from "@/contexts/theme-context";
import { Loader2, Save, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const THEME_SWITCH_COST = 50; // Cost in tokens to switch themes

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [initialTheme, setInitialTheme] = useState(theme);
  const [tokens, setTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if this is the first time selecting a theme
  const isFirstTime = initialTheme === 'classic' && selectedTheme !== 'classic';
  
  // Check if the theme has been changed from initial
  const isThemeChanged = selectedTheme !== initialTheme;
  
  // Check if the user has enough tokens to change the theme
  const canSwitchTheme = tokens >= THEME_SWITCH_COST || isFirstTime;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSelectedTheme(userData.theme || "classic");
          setInitialTheme(userData.theme || "classic");
          setTokens(userData.tokens ?? 0);
        } else {
          // Handle case where user document doesn't exist
          console.warn("User document not found");
          setSelectedTheme("classic");
          setInitialTheme("classic");
          setTokens(0);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user settings. Please try again later.');
        // Set defaults in case of error
        setSelectedTheme("classic");
        setInitialTheme("classic");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user]);

  const handleUpdateTheme = (theme: string) => {
    setSelectedTheme(theme);
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error("You must be logged in to save settings");
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Calculate token cost if changing theme
      let newTokens = tokens;
      if (isThemeChanged && !isFirstTime) {
        newTokens -= THEME_SWITCH_COST;
      }
      
      // Update user document
      await updateDoc(userRef, {
        theme: selectedTheme,
        tokens: newTokens,
        lastUpdated: new Date().toISOString()
      });
      
      // Update global theme context
      setTheme(selectedTheme);
      
      // Update local state
      setTokens(newTokens);
      setInitialTheme(selectedTheme);
      setSuccess("Settings updated successfully!");
      toast.success("Theme updated successfully!");
      
      // Reload page after a short delay to apply theme changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to update settings. Please try again.');
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <ThemedHeader
        theme={selectedTheme}
        title="Settings"
        subtitle="Customize your experience"
        className="mb-8"
      />
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-200 p-4 rounded-md mb-6">
          {success}
        </div>
      )}
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Theme Selection</h2>
        <ThemedCard
          theme={selectedTheme}
          title="Choose Your Theme"
          variant="normal"
          className="mb-4"
        >
          <div className="mb-4">
            <ThemeSelector 
              currentTheme={selectedTheme} 
              onThemeSelect={handleUpdateTheme} 
            />
          </div>
          
          {isThemeChanged && !isFirstTime && (
            <div className="text-sm p-3 rounded-md bg-slate-800/50 mb-4">
              <div className="flex items-center justify-between">
                <span>Theme change cost:</span>
                <span className="flex items-center">
                  <Coins className="h-4 w-4 mr-1 text-yellow-400" />
                  <span>{THEME_SWITCH_COST} tokens</span>
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Your tokens:</span>
                <span className="flex items-center">
                  <Coins className="h-4 w-4 mr-1 text-yellow-400" />
                  <span>{tokens}</span>
                </span>
              </div>
              {!canSwitchTheme && (
                <div className="text-red-400 mt-2">
                  You don't have enough tokens to change your theme.
                </div>
              )}
            </div>
          )}
        </ThemedCard>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveSettings}
          disabled={saving || (isThemeChanged && !canSwitchTheme)}
          className="flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
} 
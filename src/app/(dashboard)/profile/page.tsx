"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { Loader2, Save, User, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

const AVAILABLE_THEMES = [
  {
    id: "naruto",
    name: "Naruto Ninja Way",
    description: "Follow your ninja path! Choose your character and progress through their iconic forms and abilities.",
    characters: [
      {
        id: "naruto",
        name: "Naruto Uzumaki",
        description: "Master the power of the Nine-Tails and become the Hokage!",
        levels: ["Academy Student", "Genin", "Chunin", "Sage Mode", "Nine-Tails Chakra Mode", "Six Paths Sage Mode"]
      },
      {
        id: "guy",
        name: "Might Guy",
        description: "Master the power of youth and the Eight Inner Gates!",
        levels: ["Genin", "Chunin", "Jonin", "Six Gates", "Seven Gates", "Eight Gates"]
      },
      {
        id: "sasuke",
        name: "Sasuke Uchiha",
        description: "Unlock the power of the Sharingan and seek true strength.",
        levels: ["Academy Student", "Sharingan", "Curse Mark", "Mangekyo Sharingan", "Eternal Mangekyo", "Rinnegan"]
      }
    ],
    color: "text-orange-500"
  },
  {
    id: "harry-potter",
    name: "Hogwarts Houses",
    description: "Progress through your magical education at Hogwarts.",
    levels: ["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Sixth Year", "Seventh Year", "Master Wizard"],
    color: "text-purple-500"
  },
  {
    id: "dbz",
    name: "Dragon Ball Z",
    description: "Power up like a Saiyan warrior!",
    levels: ["Earthling", "Saiyan", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 3", "Super Saiyan God"],
    color: "text-yellow-500"
  },
  {
    id: "classic",
    name: "Classic Ranks",
    description: "Traditional progression system with classic ranks.",
    levels: ["Beginner", "Intermediate", "Advanced", "Expert", "Master", "Grandmaster"],
    color: "text-blue-500"
  }
];

interface UserPreferences {
  theme: string;
  character?: string;
  displayName: string;
  email: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("classic");
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isGeneratingCharacter, setIsGeneratingCharacter] = useState(false);
  const [customCharacterPrompt, setCustomCharacterPrompt] = useState("");

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    async function fetchPreferences() {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserPreferences;
          setPreferences(userData);
          setSelectedTheme(userData.theme || "classic");
          setSelectedCharacter(userData.character || null);
          setDisplayName(userData.displayName || "");
        }
      } catch (err) {
        console.error('Error fetching preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, [user, router]);

  const handleGenerateCustomCharacter = async () => {
    if (!customCharacterPrompt) return;
    
    setIsGeneratingCharacter(true);
    try {
      const response = await fetch('/api/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customCharacterPrompt })
      });
      
      if (!response.ok) throw new Error('Failed to generate character');
      
      const data = await response.json();
      // Add the new character to the Naruto theme
      const narutoTheme = AVAILABLE_THEMES.find(theme => theme.id === "naruto");
      if (narutoTheme && 'characters' in narutoTheme) {
        narutoTheme.characters.push(data);
      }
      
      setSelectedCharacter(data.id);
      setSuccess('Custom character generated successfully!');
    } catch (err) {
      console.error('Error generating character:', err);
      setError('Failed to generate custom character. Please try again.');
    } finally {
      setIsGeneratingCharacter(false);
      setCustomCharacterPrompt("");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        theme: selectedTheme,
        character: selectedCharacter,
        displayName: displayName,
        updatedAt: new Date()
      });

      setSuccess('Settings saved successfully!');
      
      setPreferences(prev => ({
        ...prev!,
        theme: selectedTheme,
        character: selectedCharacter,
        displayName: displayName
      }));

    } catch (err) {
      console.error('Error saving preferences:', err);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-slate-200">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
          <p className="text-slate-400">Customize your learning experience</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Personal Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Enter your display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full bg-slate-700 text-white rounded-lg px-4 py-2 opacity-70 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-6">
              <Palette className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold">Theme Preferences</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {AVAILABLE_THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                    selectedTheme === theme.id
                      ? "bg-blue-500/20 border-2 border-blue-500"
                      : "bg-slate-700 border-2 border-transparent hover:border-slate-500"
                  }`}
                  onClick={() => {
                    setSelectedTheme(theme.id);
                    setSelectedCharacter(null); // Reset character when changing theme
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${theme.color}`}>{theme.name}</h3>
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      selectedTheme === theme.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-500"
                    }`} />
                  </div>
                  <p className="text-sm text-slate-300">{theme.description}</p>
                  
                  {theme.id === "naruto" && selectedTheme === "naruto" && (
                    <div className="mt-4 space-y-4">
                      <h4 className="font-medium text-sm text-slate-200">Choose Your Character</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {theme.characters.map((character) => (
                          <div
                            key={character.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${
                              selectedCharacter === character.id
                                ? "bg-orange-500/20 border border-orange-500"
                                : "bg-slate-600 border border-transparent hover:border-orange-400"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCharacter(character.id);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-orange-400">{character.name}</h5>
                              <div className={`w-3 h-3 rounded-full border ${
                                selectedCharacter === character.id
                                  ? "border-orange-500 bg-orange-500"
                                  : "border-slate-400"
                              }`} />
                            </div>
                            <p className="text-xs text-slate-300 mt-1">{character.description}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {character.levels.map((level, index) => (
                                <span
                                  key={index}
                                  className="text-xs bg-slate-500 text-slate-200 px-1.5 py-0.5 rounded"
                                >
                                  {level}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-600">
                        <h4 className="font-medium text-sm text-slate-200 mb-2">Generate Custom Character</h4>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customCharacterPrompt}
                            onChange={(e) => setCustomCharacterPrompt(e.target.value)}
                            placeholder="Describe your Naruto character..."
                            className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateCustomCharacter();
                            }}
                            disabled={isGeneratingCharacter || !customCharacterPrompt}
                            className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
                          >
                            {isGeneratingCharacter ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              'Generate'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {theme.id !== "naruto" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {theme.levels.map((level, index) => (
                        <span
                          key={index}
                          className="text-xs bg-slate-600 text-slate-200 px-2 py-1 rounded"
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4">
          <div className="container mx-auto flex items-center justify-end gap-4">
            {error && (
              <p className="text-red-400">{error}</p>
            )}
            {success && (
              <p className="text-green-400">{success}</p>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 min-w-[150px] justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 
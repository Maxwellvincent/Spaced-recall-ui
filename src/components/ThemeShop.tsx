"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getThemeConfig } from '@/utils/themeUtils';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Theme {
  name: string;
  description: string;
  previewImage: string;
  cost: number;
}

const themes: Theme[] = [
  {
    name: 'Classic',
    description: 'The original theme with a clean and modern design.',
    previewImage: '/themes/classic-preview.png',
    cost: 0,
  },
  {
    name: 'Nature',
    description: 'A calming theme inspired by the natural world.',
    previewImage: '/themes/nature-preview.png',
    cost: 100,
  },
  {
    name: 'Space',
    description: 'An otherworldly theme with cosmic elements.',
    previewImage: '/themes/space-preview.png',
    cost: 200,
  },
];

export function ThemeShop() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const [currentTheme, setCurrentTheme] = useState('');
  const [lastThemeChange, setLastThemeChange] = useState<Date | null>(null);
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setTokens(data.tokens || 0);
          setCurrentTheme(data.theme || 'Classic');
          setLastThemeChange(data.lastThemeChange ? new Date(data.lastThemeChange) : null);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load user data');
        setLoading(false);
      }
    }

    loadUserData();
  }, [user]);

  const canChangeTheme = (theme: Theme) => {
    if (theme.name === currentTheme) return false;
    if (theme.name === 'Classic') return true;
    if (tokens < theme.cost) return false;
    if (!lastThemeChange) return true;

    // 24-hour cooldown
    const cooldownHours = 24;
    const cooldownEnds = new Date(lastThemeChange.getTime() + cooldownHours * 60 * 60 * 1000);
    return new Date() > cooldownEnds;
  };

  const getCooldownTime = () => {
    if (!lastThemeChange) return null;
    const cooldownHours = 24;
    const cooldownEnds = new Date(lastThemeChange.getTime() + cooldownHours * 60 * 60 * 1000);
    const now = new Date();
    if (now > cooldownEnds) return null;

    const diff = cooldownEnds.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleThemeChange = async (theme: Theme) => {
    if (!user || changing || !canChangeTheme(theme)) return;

    try {
      setChanging(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        theme: theme.name,
        tokens: tokens - theme.cost,
        lastThemeChange: new Date().toISOString(),
      });

      setCurrentTheme(theme.name);
      setTokens(prev => prev - theme.cost);
      setLastThemeChange(new Date());
      toast.success(`Theme changed to ${theme.name}`);
    } catch (err) {
      toast.error('Failed to change theme');
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  const cooldownTime = getCooldownTime();

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Theme Shop</h1>
        <div className="text-lg">
          Tokens: <span className="font-bold">{tokens}</span>
        </div>
      </div>

      {cooldownTime && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Theme change cooldown: {cooldownTime} remaining
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <Card key={theme.name} className="p-4 space-y-4">
            <div className="aspect-video relative rounded-lg overflow-hidden bg-gray-100">
              {theme.previewImage && (
                <img
                  src={theme.previewImage}
                  alt={`${theme.name} theme preview`}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{theme.name}</h3>
              <p className="text-gray-600 text-sm">{theme.description}</p>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm">
                Cost: <span className="font-semibold">{theme.cost} tokens</span>
              </div>
              <Button
                onClick={() => handleThemeChange(theme)}
                disabled={!canChangeTheme(theme) || changing}
                variant={currentTheme === theme.name ? 'outline' : 'default'}
              >
                {changing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : currentTheme === theme.name ? (
                  'Selected'
                ) : (
                  'Select'
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">How to Earn Tokens</h2>
        <ul className="space-y-2">
          <li>• Complete study sessions (+10 tokens)</li>
          <li>• Maintain daily streaks (+5 tokens per day)</li>
          <li>• Achieve mastery in topics (+20 tokens)</li>
          <li>• Complete weekly challenges (+50 tokens)</li>
        </ul>
      </div>
    </div>
  );
} 
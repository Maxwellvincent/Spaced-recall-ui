'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoyaltyRewards from '@/components/LoyaltyRewards';
import { ThemeConfig, ThemeLoyalty } from '@/lib/xpSystem';

export default function RewardsPage() {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig>({
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      background: '#1e293b',
      text: '#f8fafc'
    }
  });
  const [currentLoyalty, setCurrentLoyalty] = useState<ThemeLoyalty>({
    loyaltyPoints: 0,
    streakDays: 0,
    stars: 0,
    lastActiveDate: new Date().toISOString(),
    themeHistory: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentTheme(userData.currentTheme || currentTheme);
          setCurrentLoyalty(userData.loyalty || currentLoyalty);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const handleLoyaltyUpdate = (newLoyalty: ThemeLoyalty) => {
    setCurrentLoyalty(newLoyalty);
    // TODO: Update Firestore
  };

  const handleRewardRedeem = (reward: any) => {
    // TODO: Handle reward redemption
    console.log('Reward redeemed:', reward);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Loyalty & Rewards</h1>
      <LoyaltyRewards
        currentTheme={currentTheme}
        currentLoyalty={currentLoyalty}
        onLoyaltyUpdate={handleLoyaltyUpdate}
        onRewardRedeem={handleRewardRedeem}
      />
    </div>
  );
} 
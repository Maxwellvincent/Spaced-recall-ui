'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import LoyaltyRewards from '@/components/LoyaltyRewards';
import { ThemeConfig as LoyaltyThemeConfig, ThemeLoyalty } from '@/lib/xpSystem';
import { themeConfig } from '@/config/themeConfig';
import { logUserActivity } from '@/utils/logUserActivity';

export default function RewardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<LoyaltyThemeConfig | null>(null);
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
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        console.log('[RewardsPage] Fetching user data for:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log('[RewardsPage] Full user data:', JSON.stringify(userData, null, 2));
          
          // Map the theme data to the format expected by LoyaltyRewards
          if (userData.theme && themeConfig[userData.theme.toLowerCase()]) {
            const theme = themeConfig[userData.theme.toLowerCase()];
            console.log('[RewardsPage] Found theme:', theme.label);
            setCurrentTheme({
              name: theme.label,
              description: theme.description,
              xpMultiplier: 1.0, // Default multiplier
              avatarLevels: theme.avatars.map(avatar => ({
                level: avatar.level,
                name: avatar.name,
                image: avatar.image,
                description: avatar.description || ''
              }))
            });
          } else {
            console.log('[RewardsPage] No theme found or invalid theme:', userData.theme);
          }

          // Handle loyalty data
          if (userData.loyalty) {
            setCurrentLoyalty(userData.loyalty);
          }
        }
      } catch (error) {
        console.error('[RewardsPage] Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      console.log('[RewardsPage] Auth ready, fetching data');
      fetchUserData();
    }
  }, [user, authLoading]);

  const handleLoyaltyUpdate = async (newLoyalty: ThemeLoyalty) => {
    if (!user) return;
    
    setCurrentLoyalty(newLoyalty);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        loyalty: newLoyalty
      });
      // Dual-write: also update global rewards and user subcollection
      await setDoc(doc(db, 'rewards', user.uid), { userId: user.uid, loyalty: newLoyalty });
      await setDoc(doc(db, 'users', user.uid, 'rewards', user.uid), { userId: user.uid, loyalty: newLoyalty });
      // Log activity
      await logUserActivity(user.uid, {
        type: 'reward_earned',
        detail: `Updated loyalty/reward`,
        loyalty: newLoyalty
      });
    } catch (error) {
      console.error('Error updating loyalty:', error);
    }
  };

  const handleRewardRedeem = async (reward: any) => {
    if (!user) return;
    
    try {
      // TODO: Implement reward redemption logic
      console.log('Reward redeemed:', reward);
    } catch (error) {
      console.error('Error redeeming reward:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user && !authLoading && !loading) {
    return <div className="text-center mt-8 text-lg text-red-500">Please log in to view your rewards.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Loyalty & Rewards</h1>
      <LoyaltyRewards
        currentTheme={currentTheme || {
          name: 'Default',
          description: 'Default theme',
          xpMultiplier: 1.0,
          avatarLevels: []
        }}
        currentLoyalty={currentLoyalty}
        onLoyaltyUpdate={handleLoyaltyUpdate}
        onRewardRedeem={handleRewardRedeem}
      />
    </div>
  );
} 
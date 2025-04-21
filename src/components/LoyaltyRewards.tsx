import { useState, useEffect } from 'react';
import { 
  ThemeLoyalty, 
  Reward, 
  AVAILABLE_REWARDS, 
  updateLoyaltyStatus,
  redeemReward,
  calculateLoyaltyPoints
} from '@/lib/xpSystem';
import { ThemeConfig } from '@/lib/xpSystem';

interface LoyaltyRewardsProps {
  currentTheme: ThemeConfig;
  currentLoyalty: ThemeLoyalty;
  onLoyaltyUpdate: (newLoyalty: ThemeLoyalty) => void;
  onRewardRedeem: (reward: Reward) => void;
}

export default function LoyaltyRewards({
  currentTheme,
  currentLoyalty,
  onLoyaltyUpdate,
  onRewardRedeem
}: LoyaltyRewardsProps) {
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [message, setMessage] = useState<string>('');

  // Update loyalty status daily
  useEffect(() => {
    const today = new Date();
    const lastActive = new Date(currentLoyalty.lastActiveDate);
    if (today.toDateString() !== lastActive.toDateString()) {
      const updatedLoyalty = updateLoyaltyStatus(currentLoyalty);
      onLoyaltyUpdate(updatedLoyalty);
    }
  }, []);

  const handleRedeemReward = (reward: Reward) => {
    const result = redeemReward(currentLoyalty, reward);
    if (result.success) {
      onLoyaltyUpdate(result.newLoyalty);
      onRewardRedeem(reward);
    }
    setMessage(result.message);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Loyalty & Rewards</h2>

      {/* Loyalty Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Your Loyalty Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-gray-400">Current Theme</p>
            <p className="font-medium">{currentTheme.name}</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-gray-400">Loyalty Points</p>
            <p className="font-medium">{currentLoyalty.loyaltyPoints}</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-gray-400">Streak</p>
            <p className="font-medium">{currentLoyalty.streakDays} days</p>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <p className="text-sm text-gray-400">Stars</p>
            <p className="font-medium">{currentLoyalty.stars} ⭐</p>
          </div>
        </div>
      </div>

      {/* Rewards */}
      <div>
        <h3 className="text-lg font-medium mb-4">Available Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_REWARDS.map((reward) => (
            <div
              key={reward.id}
              className={`p-4 rounded-lg ${
                currentLoyalty.loyaltyPoints >= reward.cost
                  ? 'bg-slate-700 hover:bg-slate-600 cursor-pointer'
                  : 'bg-slate-800 opacity-50'
              }`}
              onClick={() => {
                if (currentLoyalty.loyaltyPoints >= reward.cost) {
                  setSelectedReward(reward);
                  handleRedeemReward(reward);
                }
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{reward.name}</h4>
                  <p className="text-sm text-gray-400">{reward.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Cost</p>
                  <p className="font-medium">{reward.cost} points</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="mt-4 p-3 rounded-lg bg-blue-600 text-white">
          {message}
        </div>
      )}

      {/* Streak Bonuses Info */}
      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Streak Bonuses</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-sm text-gray-400">7 Days</p>
            <p className="font-medium">+20% Points</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-sm text-gray-400">30 Days</p>
            <p className="font-medium">+50% Points</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-sm text-gray-400">90 Days</p>
            <p className="font-medium">+100% Points</p>
          </div>
          <div className="bg-slate-700 p-3 rounded-lg">
            <p className="text-sm text-gray-400">1 Year</p>
            <p className="font-medium">+200% Points</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
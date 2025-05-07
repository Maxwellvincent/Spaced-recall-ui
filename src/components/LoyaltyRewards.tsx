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
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";

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

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-xl shadow-xl"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-4 mb-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Loyalty & Rewards
          </h2>
          <p className="text-slate-400 mt-1">Earn points, unlock rewards, keep your streak alive!</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 bg-slate-700/50 px-4 py-2 rounded-full cursor-help">
                <span className="text-yellow-400">⭐</span>
                <span className="font-semibold">{currentLoyalty.stars}</span>
                <InfoIcon className="w-4 h-4 text-slate-400" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Stars are earned by maintaining streaks and completing study sessions.</p>
              <p className="mt-1">• Daily login: 1 star</p>
              <p>• 7-day streak: 5 stars</p>
              <p>• 30-day streak: 20 stars</p>
              <p>• Study completion: 1-3 stars based on duration</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      {/* Loyalty Status */}
      <motion.div variants={itemVariants} className="mb-8">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Your Progress</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Current Theme</p>
            </div>
            <p className="text-lg font-semibold text-slate-200">{currentTheme?.name || 'Default'}</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 cursor-help">
                      <p className="text-sm font-medium text-slate-400">Loyalty Points</p>
                      <InfoIcon className="w-4 h-4 text-slate-500" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Earn loyalty points through:</p>
                    <p className="mt-1">• Daily study sessions</p>
                    <p>• Maintaining streaks</p>
                    <p>• Completing subjects</p>
                    <p>• Achieving mastery levels</p>
                    <p className="mt-2 text-sm text-slate-400">Points can be used to purchase rewards!</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-lg font-semibold text-slate-200">{currentLoyalty.loyaltyPoints}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Streak</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-semibold text-slate-200">{currentLoyalty.streakDays}</p>
              <p className="text-sm text-slate-400">days</p>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">Stars</p>
            </div>
            <p className="text-lg font-semibold text-slate-200">{currentLoyalty.stars} ⭐</p>
          </div>
        </div>
      </motion.div>

      {/* Rewards */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Available Rewards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_REWARDS.map((reward) => (
            <motion.div
              key={reward.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group p-6 rounded-xl border transition-all duration-300 ${
                currentLoyalty.loyaltyPoints >= reward.cost
                  ? 'bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800/50 opacity-50 cursor-not-allowed'
              }`}
              onClick={() => {
                if (currentLoyalty.loyaltyPoints >= reward.cost) {
                  setSelectedReward(reward);
                  handleRedeemReward(reward);
                }
              }}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h4 className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                    {reward.name}
                  </h4>
                  <p className="text-sm text-slate-400 mt-1">{reward.description}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1 rounded-full">
                  <span className="text-purple-400">{reward.cost}</span>
                  <span className="text-sm text-slate-400">pts</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mt-6 p-4 rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-400"
        >
          {message}
        </motion.div>
      )}

      {/* Streak Bonuses */}
      <motion.div variants={itemVariants} className="mt-8">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">Streak Bonuses</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { days: 7, bonus: 20 },
            { days: 30, bonus: 50 },
            { days: 90, bonus: 100 },
            { days: 365, bonus: 200 }
          ].map((streak) => (
            <div
              key={streak.days}
              className={`relative p-6 rounded-xl border transition-all duration-300 ${
                currentLoyalty.streakDays >= streak.days
                  ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50'
                  : 'bg-slate-800/50 border-slate-700/50'
              }`}
            >
              <div className="flex flex-col">
                <p className="text-sm font-medium text-slate-400">{streak.days} Days</p>
                <p className="text-lg font-semibold text-slate-200">+{streak.bonus}% Points</p>
              </div>
              {currentLoyalty.streakDays >= streak.days && (
                <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
} 
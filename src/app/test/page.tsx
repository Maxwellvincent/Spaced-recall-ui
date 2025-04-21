'use client';

import { useState } from 'react';
import StudyVerification from '@/components/StudyVerification';

export default function TestPage() {
  const [xpEarned, setXpEarned] = useState<number>(0);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Study Verification Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Parameters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-gray-600">Subject: Biology</p>
              <p className="text-gray-600">Topic: Cell Structure</p>
              <p className="text-gray-600">Study Duration: 30 minutes</p>
              <p className="text-gray-600">Study Type: Practice</p>
            </div>
            <div>
              <p className="text-gray-600">XP Earned: {xpEarned}</p>
            </div>
          </div>
        </div>

        <StudyVerification
          subject="Biology"
          topic="Cell Structure"
          studyDuration={30}
          studyType="practice"
          onComplete={(xp) => {
            console.log('Study verification completed. XP earned:', xp);
            setXpEarned(xp);
          }}
        />
      </div>
    </div>
  );
} 
'use client';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, AuthProvider } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = async (provider: AuthProvider) => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">🔐 Log In</h1>
      <p className="mb-6">Use your Google account to access your Spaced Recall Dashboard.</p>
      <button
        onClick={() => handleLogin(new GoogleAuthProvider())}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}

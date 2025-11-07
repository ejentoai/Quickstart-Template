'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings - login system has been removed
    router.replace('/settings');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-600">The login system has been replaced with configuration-based authentication.</p>
      </div>
    </div>
  );
}

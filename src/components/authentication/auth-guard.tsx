'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, getEjentoAccessToken } from '@/cookie';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const ejentoToken = getEjentoAccessToken();
    const user_info = localStorage.getItem('user_info')

    const isAuthFlowEnabled =
      process.env.NEXT_PUBLIC_AUTH_FLOW === 'true' ||
      process.env.NEXT_PUBLIC_AUTH_FLOW === '1';

    if (isAuthFlowEnabled) {
      if (!token || !ejentoToken) {
        router.push('/auth/login');
        return;
      }
    }

    if(!user_info){
      router.push('/auth/userData')
    }
    
    // Only set authenticated to true after checking
    setIsAuthenticated(true);
  }, [router]);

  if (isAuthenticated === null) {
    return null;
  }

  // Only render children after confirming auth on client
  return <>{children}</>;
}
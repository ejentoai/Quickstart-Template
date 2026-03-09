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
    const isAuthFlowEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
 
    if (!isAuthFlowEnabled) {
      setIsAuthenticated(true);
      return;
    }
 
    const token = getAccessToken();
    const ejentoToken = getEjentoAccessToken();
    const user_info = localStorage.getItem('user_info');
 
    if (!token || !ejentoToken) {
      router.push('/auth/login');
      return;
    }
 
 
    if (!user_info) {
      router.push('/auth/userData');
      return;
    }
 
    setIsAuthenticated(true);
  }, [router]);
 
  if (isAuthenticated === null) return null;
 
  return <>{children}</>;
}
 
 
 
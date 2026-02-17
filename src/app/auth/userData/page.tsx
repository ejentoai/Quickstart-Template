
'use client'

import { useApiService } from "@/hooks/useApiService";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserToStorage,removeAccessToken,removeEjentoAccessToken } from '@/cookie';
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/app/context/ConfigContext";
import { ConfigError } from "@/components/configError";
import { useAuth } from "@/app/context/AuthContext";

const UserData = () => {
  const router = useRouter();
  const apiService = useApiService();
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const { clearConfig,isLoading: configLoading } = useConfig();
  const { setUserId } = useAuth()

  useEffect(() => {

    const fetchUser = async (): Promise<void> => {
      try {
        if (!apiService) return;
    
        // Agent validation (only when authentication flow is enabled)
        if (isAuthEnabled) {
          const validationResponse = await fetch('/api/config/validate-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
    
          const validationResult = await validationResponse.json();
    
          if (!validationResult.success) {
            toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
            removeAccessToken();
            removeEjentoAccessToken();
            router.push('/auth/login');
            return;
          }
        }
    
        // Agent validation successful, fetch user data
        const response = await apiService.getCurrentUser();
        const user = response.data;
        const userId = user.id;
    
        const userToStore = {
          id : user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          name: user.name,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser,
        };
    
        if (!userToStore) return;
    
        try {
          // Create user in database
          const createResponse = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
    
          const data = await createResponse.json();
    
          if (!createResponse.ok) {
            console.error('Failed to create user:', data.error);
            toast.error(data.error || 'Failed to create user');
            return;
          }
          setUserId(userId)
          // Store user locally for sidebar usage
          setUserToStorage({
            success: true,
            message: 'User data loaded',
            data: userToStore,
          });
    
          // Success → redirect to chat
          router.push('/chat');
        } catch (error: any) {
          console.error('Error creating user:', error);
          toast.error('Something went wrong. Please try again.');
          removeAccessToken()
          removeEjentoAccessToken()
          router.push('/auth/login');
          return;
        }
      } catch (error: unknown) {
        console.error('Failed to fetch user:', error);
        toast.error('Failed to fetch user data. Please try again.');
        removeAccessToken()
        removeEjentoAccessToken()
        router.push('/auth/login');
      }
    };
    

    fetchUser();
  }, [apiService, router]);

  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here 
    return <ConfigError/>;
  }
  

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 border border-gray-300 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-700">
          Please wait while we process your request…
        </p>
      </div>
    </div>
  );
};

export default UserData;


'use client'

import { useApiService } from "@/hooks/useApiService";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserToStorage,removeAccessToken,removeEjentoAccessToken } from '@/cookie';
import { Loader2 } from "lucide-react";
import { toast } from "sonner";


const UserData = () => {
  const router = useRouter();
  const apiService = useApiService();

  useEffect(() => {

    const fetchUser = async () => {
      try {
        if (!apiService) return;

        // First, validate agent using token from cookie
        const validationResponse = await fetch('/api/config/validate-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const validationResult = await validationResponse.json();

        if (!validationResult.success) {
          toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
          removeAccessToken()
          removeEjentoAccessToken()
          router.push("/auth/login");
          return;
        }
        else if(validationResult.success && process.env.ENV_DRIVEN === 'false'){
          toast.success('Agent validated successfully')
        }

        // Agent validation successful, now fetch user data
        const response = await apiService.getCurrentUser();
        const user = response.data; 

        if (user) {
          setUserToStorage(user) //to use in sidebar
        }
        router.push("/chat");
      } catch (error) {
        console.error("Failed to fetch user", error);
        toast.error('Failed to fetch user data. Please try again.');
        router.push("/auth/login");
      }
    };

    fetchUser();
  }, [apiService, router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 border border-gray-300 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-700">
          Please wait while you are being logged in...
        </p>
      </div>
    </div>
  );
};

export default UserData;

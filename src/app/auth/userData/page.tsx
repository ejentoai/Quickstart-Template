
'use client'

import { useApiService } from "@/hooks/useApiService";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserToStorage,removeAccessToken,removeEjentoAccessToken } from '@/cookie';
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/app/context/ConfigContext";
import { ConfigError } from "@/components/configError";

const UserData = () => {
  const router = useRouter();
  const apiService = useApiService();
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const { clearConfig,isLoading: configLoading } = useConfig();
  const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true'

  useEffect(() => {

    const fetchUser = async (): Promise<void> => {
      try {
        if (!apiService) return;
        //Agent validation will be done at this point, only when authentication flow is enabled,
        //otherwise it is done at time of config validation.
        if(isAuthEnabled){
          //First, validate agent using token from cookie
          const validationResponse = await fetch('/api/config/validate-agent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          const validationResult = await validationResponse.json();

          if (!validationResult.success) {
            toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
            removeAccessToken();
            removeEjentoAccessToken();
            router.push("/auth/login");
            return;
          }
        }

        // Agent validation successful, now fetch user data
        const response = await apiService.getCurrentUser();
        const user = response.data; 

        const userToStore = {
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          name: user.name,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser,
        };

        if (userToStore) {
          setUserToStorage({
            success : true,
            message : 'user data loaded',
            data : userToStore
          }) //to use in sidebar
        }
        router.push("/chat");
      } catch (error : unknown) {
        console.error("Failed to fetch user", error);
        toast.error('Failed to fetch user data. Please try again.');
        router.push("/auth/login");
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

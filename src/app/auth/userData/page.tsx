'use client'

import { useApiService } from "@/hooks/useApiService";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserToCookie, removeAccessToken, removeEjentoAccessToken, getEjentoAccessToken } from '@/cookie';
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/app/context/ConfigContext";
import { ConfigError } from "@/components/configError";
import { useAuth } from "@/app/context/AuthContext";

const UserData = () => {
  const router = useRouter();
  const apiService = useApiService();
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true'
  const { loadConfig, isLoading: configLoading, config, setConfig } = useConfig();
  const { setUserId } = useAuth()
  const ejentoAccessToken = getEjentoAccessToken();
  const envDriven = process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true'
  const publicMode = process.env.NEXT_PUBLIC_AGENT === 'true'



  useEffect(() => {
    console.log('from user datapage')
    const fetchUser = async (): Promise<void> => {
      try {
        if (!apiService) return;
   
        // Agent validation (only when authentication flow is enabled)
        if (isAuthEnabled) {
          console.log('Validating agent with config:', {
            hasConfig: !!config,
            baseUrl: config?.baseUrl ? '[PRESENT]' : '[MISSING]',
            apiKey: config?.apiKey ? '[PRESENT]' : '[MISSING]',
            agentId: config?.agentId ? '[PRESENT]' : '[MISSING]',
          });

          // Make sure we have config
          if (!envDriven && (!config?.baseUrl || !config?.apiKey || !config?.agentId)) {
            console.error('Missing config for agent validation');
            toast.error('Configuration missing. Please reconfigure.');
            router.push('/settings');
            return;
          }

          // Send config in request body
          const validationResponse = await fetch('/api/config/validate-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              config: {
                baseUrl: config?.baseUrl,
                apiKey: config?.apiKey,
                agentId: config?.agentId
              }
            }),
          });
   
          const validationResult = await validationResponse.json();
          console.log('Validation result:', validationResult);
   
          if (!validationResult.success) {
            toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
            removeAccessToken();
            removeEjentoAccessToken();
            router.push('/auth/login');
            return;
          }

          console.log('Agent validation successful');
        }
   
        // Agent validation successful, fetch user data
        console.log('Fetching user data...');
        const response = await apiService.getCurrentUser();
        const user = response.data;
        const userId = user.id;
   
        const userToStore = {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          name: user.name,
          is_staff: user.is_staff,
          is_superuser: user.is_superuser,
        };
   
        if (!userToStore) return;
   
        try {
          setUserToCookie({
            success: true,
            message: 'User data loaded',
            data: userToStore,
          });

          if(publicMode){
            try {
              const res = await fetch("/api/user", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId }),
              });
        
              const data = await res.json();
        
              if (!res.ok) {
                throw new Error(data.error);
              }
              router.push('/chat');
              console.log("User created:", data);
              
            } catch (error: any) {
              console.error(error.message);
              toast.error('Error creating user');
              removeAccessToken();
              removeEjentoAccessToken();
              router.push('/auth/login');
            }
          };
          
          if (!envDriven && !publicMode) {
            console.log('Public mode detected. Preparing config for DB save...');


            // Validate config before saving
            if (!config?.baseUrl || !config?.apiKey || !config?.agentId) {
              console.error('Missing configuration in public mode');
              toast.error('Configuration missing. Please reconfigure.');
              removeAccessToken();
              removeEjentoAccessToken();
              localStorage.removeItem('config_validated');
              router.push('/settings');
              return;
            }

            try {
              console.log('Saving config to database for user:', userId);

              const configResponse = await fetch('/api/ejento-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  baseUrl: config?.baseUrl,
                  apiKey: config?.apiKey,
                  agentId: config?.agentId,
                  ejentoAccessToken: ejentoAccessToken,
                }),
              });

              if (!configResponse.ok) {
                const errorData = await configResponse.json();
                console.error('Failed to save config:', errorData.error);
                toast.error('Failed to save configuration to server.');

                removeAccessToken();
                removeEjentoAccessToken();
                localStorage.removeItem('config_validated');
                router.push('/settings');
                return;
              }

              console.log('Config saved successfully');
            } catch (configError) {
              console.error('Error saving config:', configError);
              toast.error('Network error while saving configuration.');

              removeAccessToken();
              removeEjentoAccessToken();
              localStorage.removeItem('config_validated');
              router.push('/settings');
              return;
            }
          }

          // --- Remove validation flag from localStorage ---
          localStorage.removeItem('config_validated');
          
          // Store user locally for sidebar usage
   
          // Success → redirect to chat
          console.log('User data processed successfully, redirecting to chat');
          await loadConfig()       
          router.push('/chat');
        } catch (error: any) {
          console.error('Error creating user:', error);
          toast.error('Something went wrong. Please try again.');
          removeAccessToken();
          removeEjentoAccessToken();
          router.push('/auth/login');
          return;
        }
      } catch (error: unknown) {
        console.error('Failed to fetch user:', error);
        toast.error('Failed to fetch user data. Please try again.');
        removeAccessToken();
        removeEjentoAccessToken();
        router.push('/auth/login');
      }
    };
   
    fetchUser();
  }, [apiService, router, config, isAuthEnabled, setUserId]);

  if (!apiService && !configLoading) {
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
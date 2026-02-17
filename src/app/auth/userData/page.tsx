'use client'

import { useApiService } from "@/hooks/useApiService";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserToCookie, removeAccessToken, removeEjentoAccessToken } from '@/cookie';
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfig } from "@/app/context/ConfigContext";
import { ConfigError } from "@/components/configError";
import { useAuth } from "@/app/context/AuthContext";

const UserData = () => {
  const router = useRouter();
  const apiService = useApiService();
  const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_FLOW === 'true';
  const { isLoading: configLoading, updateConfig } = useConfig();
  const { setUserId } = useAuth();

  useEffect(() => {
    const fetchUser = async (): Promise<void> => {
      try {
        if (!apiService) return;

        // 1. Fetch user data from external API
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

        // 2. Create user in local database (if needed)
        try {
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
        } catch (error: any) {
          console.error('Error creating user:', error);
          toast.error('Something went wrong. Please try again.');
          removeAccessToken();
          removeEjentoAccessToken();
          router.push('/auth/login');
          return;
        }

        // 3. If there's a pending config (flag in localStorage), validate agent and save
        const configValidated = localStorage.getItem('config_validated');
        if (configValidated === 'true') {
          // Call the agent validation endpoint – it will also save config to DB
          const validationResponse = await fetch('/api/config/validate-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // No body needed; it will read from cookie
          });

          const validationResult = await validationResponse.json();

          if (!validationResult.success) {
            toast.error(validationResult.message || 'Agent validation failed. Please check your configuration.');
            // Do not remove flag – user may want to retry later
            return;
          }

          // Success – remove flag and update context with saved config
          localStorage.removeItem('config_validated');
          if (validationResult.config) {
            updateConfig({
              baseUrl: validationResult.config.baseUrl,
              apiKey: validationResult.config.apiKey,
              ejentoAccessToken: validationResult.config.accessToken || '',
              agentId: validationResult.config.agentId.toString(),
            }, 'database');
          }
        }

        // 4. Store user locally for sidebar
        setUserToCookie({
          success: true,
          message: 'User data loaded',
          data: userToStore,
        });
        setUserId(userId);

        // 5. Success → redirect to chat
        router.push('/chat');
      } catch (error: unknown) {
        console.error('Failed to fetch user:', error);
        toast.error('Failed to fetch user data. Please try again.');
        removeAccessToken();
        removeEjentoAccessToken();
        router.push('/auth/login');
      }
    };

    fetchUser();
  }, [apiService, router, updateConfig, setUserId]);

  if (!apiService && !configLoading) {
    return <ConfigError />;
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
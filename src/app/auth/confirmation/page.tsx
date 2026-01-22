'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { useApiService } from "@/hooks/useApiService";
import { useConfig } from "@/app/context/ConfigContext";

import {
  getAccessToken,
  removeAccessToken,
  removeEjentoAccessToken,
} from "@/cookie";

import { toast } from "sonner";
import { ConfigError } from "@/components/configError";

export default function Confirmation() {
  const router = useRouter();
  const apiService = useApiService();
  const { isLoading: configLoading } = useConfig();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handles magic link validation and navigation
  const handleClick = async () => {
    const token = getAccessToken();

    // If token is missing, redirect user back to login
    if (!token) {
      router.push("/auth/login");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await apiService?.validateMagicLink(token);

      if (result?.success) {
        router.push("/auth/userData");
      } else {
        // If validation fails, clear tokens and redirect to login
        toast.error(result?.message);
        removeAccessToken();
        removeEjentoAccessToken();
        router.push("/auth/login");
      }
    } catch (error: any) {
      // Handle unexpected errors
      toast.error(error?.message || "Something went wrong");
      router.push("/auth/login");
    }
  };

  // Show loader while config is being initialized
  if (configLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show configuration error if API service is unavailable
  if (!apiService) {
    return <ConfigError />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[360px] rounded-2xl shadow-2xl py-6">
        <div className="flex flex-col items-center gap-4">
          <CardDescription className="text-sm font-medium text-black text-center">
            Click the button to continue to Ejento AI.
          </CardDescription>

          <Button
            className="bg-[#DF5C40] hover:bg-[#DF5C40]/90 rounded-xl px-16 h-11 flex items-center gap-2"
            onClick={handleClick}
            disabled={isSubmitting}
          >
            Continue to Ejento AI
            {isSubmitting && <Spinner />}
          </Button>
        </div>
      </Card>
    </div>
  );
}

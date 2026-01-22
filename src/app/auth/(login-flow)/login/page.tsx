'use client'

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import SSOButton from "@/components/authentication/SSO_Button";
import { ssoProviders } from "./SSO_Provider";
import { LoginForm } from "@/components/authentication/login-form";
import { CardDisclaimer } from "@/components/authentication/cardDisclaimer";
import VerifyOtp from "@/components/authentication/verify-otp";

import { useConfig } from "@/app/context/ConfigContext";
import { useApiService } from "@/hooks/useApiService";
import { ConfigError } from "@/components/configError";
import LoginSkeleton from "@/components/authentication/LoginSkeleton";

type SSOProvider = {
  name: string;
  label: string;
  icon: React.ReactNode;
};

export default function LoginPage() {
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();

  const [isOtpActive, setIsOtpActive] = useState<boolean>(false);
  const [activeSSOProvider, setActiveSSOProvider] = useState<SSOProvider[]>([]);
  const [featureArrayLoading, setFeatureArrayLoading] = useState(false);
  const [showVerifyOtp,setShowVerifyOtp] = useState(false);
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiService) return;

    async function fetchFeatures() {
      setFeatureArrayLoading(true);
      try {
        const response = await apiService?.featureFlags();
       
        const featureArray = Array.isArray(response?.data?.data?.items)
          ? response.data.data.items
          : [];

        if (response?.success) {
          //check otp is enabled or disabled 
          const otpMethod = featureArray.find(
            (item : any) => item.name === "otp"
          );

          setIsOtpActive(otpMethod?.is_active ?? false);
          
          //decide the SSO which is to show 
          const activeSSOItems = featureArray.filter(
            (item: any) =>
              typeof item?.name === "string" &&
              item.name.endsWith("_sso") &&
              item.is_active
          );
          
          //filter the current sso provider to have only those SSO which are provided by feature flag api
          const filteredSSO = ssoProviders.filter((provider) =>
            activeSSOItems.some((item : any) => item.name === provider.name)
          );

          setActiveSSOProvider(filteredSSO);
        } else {
          setIsOtpActive(false);
          setActiveSSOProvider([]);
        }
      } catch (error) {
        console.error(error);
        setIsOtpActive(false);
        setActiveSSOProvider([]);
      } finally {
        setFeatureArrayLoading(false);
      }
    }

    fetchFeatures();
  }, [apiService]);

  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here 
    return <ConfigError />;
  }
  
  if (configLoading || featureArrayLoading) {
    return (
       <LoginSkeleton/>
    );
  }
  return (
    showVerifyOtp && otpSessionId ?
    <VerifyOtp otpSessionId={otpSessionId}/>
    :
    <div className="flex items-center justify-center mt-8">
      <Card className="w-full max-w-[450px] min-w-[335px] rounded-2xl shadow-lg md:px-4 md:py-6">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl text-gray-600">
            Welcome to Ejento AI
          </CardTitle>
          <CardDescription className="font-semibold">
            Sign in or Create account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {activeSSOProvider.map((item) => (
            <SSOButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              name={item.name}
            />
          ))}

          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Separator className="flex-1  h-px bg-gray-200" />
            OR
            <Separator className="flex-1  h-px bg-gray-200" />
          </div>

          <LoginForm isOtpActive={isOtpActive} setShowVerifyOtp={setShowVerifyOtp} setOtpSessionId={setOtpSessionId}/>

          <Separator className="w-full" />

          <CardDisclaimer />
        </CardContent>
      </Card>
    </div>
    
  );
}

'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OtpInput } from "@/components/authentication/otpInput";
import { Separator } from "@/components/ui/separator";
import { CardDisclaimer } from "@/components/authentication/cardDisclaimer";
import ResendOtp from "@/components/authentication/resend-otp";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

interface VerifyOtpProps {
  readonly otpSessionId?: string;
}

export default function VerifyOtp({ otpSessionId }: VerifyOtpProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const { email } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // If no otpSessionId, show error message
  if (!otpSessionId) {
    return (
      <div className="flex items-center justify-center mt-24">
        <Card className='w-full min-w-[350px] max-w-[450px] rounded-2xl shadow-lg px-4 py-6'>
          <CardHeader className='text-center space-y-3'>
            <CardTitle className='text-2xl md:text-[26px] font-medium text-[#3B4055]'>
              OTP Session Error
            </CardTitle>
            <CardDescription className="text-xs md:text-base break-words text-[#3B4055] font-normal">
              OTP session ID is missing. Please try logging in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-red-500 mb-4">
              Unable to verify OTP - session not found
            </div>
            <Separator className='w-[88%] h-[0.5px] bg-gray-200 my-4 mx-auto' />
            <CardDisclaimer />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center mt-24">
      <Card className='w-full min-w-[350px] max-w-[450px] rounded-2xl shadow-lg px-4 py-6'>
        <CardHeader className='text-center space-y-3'>
          <CardTitle className='text-2xl md:text-[26px] font-medium text-[#3B4055]'>
            We emailed you a code
          </CardTitle>
          <CardDescription className="text-xs md:text-base break-words text-[#3B4055] font-normal">
            We sent an email to {email}. Enter the code here or tap the button in the email to continue.
          </CardDescription>
          <CardDescription className="text-center text-xs md:text-base break-words word-wrap text-[#3B4055]">
            If you don&apos;t see the email, check your spam or junk folder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OtpInput 
            otp_session_id={otpSessionId} 
            setLoading={setLoading}
          />
          <ResendOtp 
            otp_session_id={otpSessionId} 
            setLoading={setLoading}
          />
          <Separator className='w-[88%] h-[0.5px] bg-gray-200 my-4 mx-auto' />
          <CardDisclaimer />
        </CardContent>
      </Card>
    </div>
  );
}
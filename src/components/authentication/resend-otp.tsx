'use client';

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/app/context/ConfigContext";
import { useApiService } from "@/hooks/useApiService";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "sonner";

interface OtpInterfaceProps {
  readonly otp_session_id: string;
  readonly setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ResendOtp({ otp_session_id, setLoading }: OtpInterfaceProps) {
  const [timer, setTimer] = useState(30);
  const [isResetDisable, setIsResetDisable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const auth = useAuth();
  const email = auth.email || "";

  useEffect(() => {
    if (configLoading || !apiService || !email) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [configLoading, apiService, email]);

  /**
   * Starts a fresh 30s countdown
   */
  const startTimer = () => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setTimer(30);
    setIsResetDisable(true);

    intervalRef.current = globalThis.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsResetDisable(false); // enable button
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Handle resend click
   */
  const handleResendCode = async () => {
    if (isLoading || isResetDisable) return;

    setIsLoading(true);
    startTimer();

    try {
      const result = await apiService?.passwordlessAuth(
        email,
        otp_session_id
      );

      if (result?.success) {
        toast.success("OTP has been resent successfully!");
      } else {
        toast.error("Failed to resend OTP");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start timer on initial mount
   */
  useEffect(() => {
    startTimer();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);


  return (
    <div className="flex gap-1 justify-center items-center mb-7">
      <div className="text-xs text-[#3B4055]">
        Didn&apos;t receive the code?
      </div>

      <Button
        onClick={handleResendCode}
        disabled={isLoading || isResetDisable}
        variant="link"
        className={`font-semibold text-[13px] p-0 h-auto ${
          isResetDisable
            ? "text-gray-400 cursor-not-allowed no-underline"
            : "text-[#3B4055] hover:text-[#db4a2b] hover:underline"
        }`}
      >
        {isResetDisable
          ? `Request a new code in ${timer}s`
          : "Request a new code"}
      </Button>
    </div>
  );
}
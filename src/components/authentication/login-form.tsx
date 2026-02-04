'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

import { loginSchema } from '@/lib/types';
import { useConfig } from '@/app/context/ConfigContext';
import { useAuth } from '@/app/context/AuthContext';
import { useApiService } from '@/hooks/useApiService';
import { ConfigError } from '../configError';
import LoginSkeleton from './LoginSkeleton';
import DOMPurify from 'dompurify';

interface LoginFormProps {
  isOtpActive: boolean;
  setShowVerifyOtp: (value: boolean) => void;
  setOtpSessionId: (id: string) => void;
}

interface LoginFormValues {
  email: string;
}

export function LoginForm({
  isOtpActive,
  setShowVerifyOtp,
  setOtpSessionId,
}: LoginFormProps) {
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const { setEmail } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const sanitizeInput = (
    input: string | undefined
  ): string | undefined => {
    if (!input) return input;
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] })?.trim();
  }
  const onSubmit = async ({ email }: LoginFormValues) => {
    try {
      const sanitizedEmail = sanitizeInput(email);
  
      if (!sanitizedEmail) {
        toast.error('Invalid email');
        return;
      }
  
      const response = await apiService?.passwordlessAuth(sanitizedEmail);
      setEmail(sanitizedEmail);
  
      if (response?.success) {
        toast.success(response?.message || 'Email sent successfully!');
        const otpId = response?.data?.data?.otp_session_id;
  
        reset();
  
        if (isOtpActive && otpId) {
          setShowVerifyOtp(true);
          setOtpSessionId(otpId);
        }
      } else {
        toast.error(response?.message || 'Error sending email!');
        reset();
        setShowVerifyOtp(false);
      }
    } catch {
      toast.error('Unexpected error occurred');
      setShowVerifyOtp(false);
    }
  };
  

  if (configLoading) return <LoginSkeleton />;
  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here 
    return <ConfigError/>;
  }
  

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input
          {...register('email')}
          placeholder="Email"
          className="h-11"
        />
        {errors.email && (
          <p className="text-red-500 mt-1 text-sm">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#DF5C40] w-full rounded-xl px-4 py-2 h-11 hover:bg-[#DF5C40]/90 flex items-center justify-center gap-2"
      >
        Continue with Email
        {isSubmitting && <Spinner />}
      </Button>
    </form>
  );
}

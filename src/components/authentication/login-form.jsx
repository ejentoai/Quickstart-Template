'use client'

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
import ConfigError from '../configError';
import LoginSkeleton from './LoginSkeleton';

export function LoginForm({ isOtpActive, setShowVerifyOtp, setOtpSessionId }) {
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const { setEmail } = useAuth();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Handle form submission
  const onSubmit = async ({ email }) => {
    try {
      const response = await apiService.passwordlessAuth(email);
      setEmail(email);
      
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
    } catch (error) {
      toast.error('Unexpected error occurred');
      setShowVerifyOtp(false);
    }
  };

  // Loading state
  if (configLoading) return <LoginSkeleton />;

  // Error if API service is not available
  if (!apiService) return <ConfigError />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input 
          {...register('email')} 
          placeholder="Email" 
          name="email" 
          className="h-11" 
        />
        {errors.email && (
          <p className="text-red-500 mt-1 text-sm">{errors.email.message}</p>
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

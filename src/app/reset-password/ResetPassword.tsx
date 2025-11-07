'use client';

import { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from '@/components/icons';
import { toast } from 'sonner';
import { resetPassword } from './api';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isSuccessful, setIsSuccessful] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(true);
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [showPasswordError, setShowPasswordError] = useState(false);

    const handlePasswordChange = (value: string) => {
        if (value.length < 8 && value !== '') {
            setShowPasswordError(true)
        } else {
            setShowPasswordError(false)
        }
        setPassword(value);
    };

    const handleNewPasswordChange = (value: string) => {
        setNewPassword(value);
        setPasswordsMatch(password === value);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!passwordsMatch) {
            toast.error('Passwords do not match.');
            return;
        }
        if (token) {
            try {
                setIsSuccessful(true)
                const response = await resetPassword(newPassword, token)
                if (response?.message) {
                    toast.success('Password reset successfully!');
                    router.push('/login')
                }
            } catch (e) {
                console.error(e)
            } finally {
                setIsSuccessful(false);
            }
        }
    };

    return (
        <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
            <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h3 className="text-xl font-semibold dark:text-zinc-50">Reset Password</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                        Enter new password to reset your account access
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
                    <div className="flex flex-col gap-2">
                        <Label className="text-zinc-600 font-normal dark:text-zinc-400">
                            New password
                        </Label>
                        <Input
                            id="new-password"
                            name="new-password"
                            className={`bg-muted text-md md:text-sm ${password.length<8 && password!=='' &&'border-red-500'
                            }`}
                            type="password"
                            placeholder="******"
                            required
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                        />
                        {
                            showPasswordError &&  <p className="text-sm text-red-500">8 characters minimum</p>
                        }
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="confirm-password" className="text-zinc-600 font-normal dark:text-zinc-400">
                            Confirm password
                        </Label>
                        <Input
                            id="confirm-password"
                            name="confirm-password"
                            className={`bg-muted text-md md:text-sm ${!passwordsMatch && 'border-red-500'
                                }`}
                            type="password"
                            placeholder="******"
                            required
                            value={newPassword}
                            onChange={(e) => handleNewPasswordChange(e.target.value)}
                        />
                        {!passwordsMatch && (
                            <p className="text-sm text-red-500">
                                Passwords do not match.
                            </p>
                        )}
                    </div>
                    <Button type="submit" className="relative" disabled={newPassword.length < 8 || !passwordsMatch}>
                        Reset Password
                        {isSuccessful && (
                            <span className="animate-spin absolute right-4">
                                <LoaderIcon />
                            </span>
                        )}
                        <output aria-live="polite" className="sr-only">
                            {isSuccessful ? 'Loading' : 'Submit form'}
                        </output>
                    </Button>
                </form>
            </div>
        </div>
    );
}

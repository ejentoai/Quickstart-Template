'use client';

import { useState } from 'react';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from '@/components/icons';
import { toast } from 'sonner';
import { recoverPassword } from './api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        if (email) {
            try {
                // Simulate API call to send recovery email
                const response = await recoverPassword(email)

                setIsLoading(false);

                if (response) {
                    toast.success('Recovery email sent successfully!');
                    setEmail(''); // Reset the email input
                    const queryParams = new URLSearchParams();
                    queryParams.append('email', email)
                    let currentUrl = window.location.href;
                    currentUrl = currentUrl.split('/recoverPassword')[0]
                    const url = currentUrl + `/emailSent?${queryParams.toString()}`
                    window.location.href = url
                } else {
                    toast.error('Failed to send recovery email.');
                }
            } catch (error) {
                setIsLoading(false);
                toast.error('An error occurred. Please try again later.');
            }
        } else {
            setIsLoading(false);
            toast.error('Please enter a valid email address.');
        }
    };

    return (
        <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
            <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
                <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
                    <h3 className="text-xl font-semibold dark:text-zinc-50">Forgot Password</h3>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">
                        Enter your email address to receive a password recovery email.
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
                    <div className="flex flex-col gap-2">
                        <Label
                            className="text-zinc-600 font-normal dark:text-zinc-400"
                        >
                            Email Address
                        </Label>

                        <Input
                            id="email"
                            name="email"
                            className="bg-muted text-md md:text-sm"
                            type="email"
                            placeholder="user@acme.com"
                            autoComplete="email"
                            required
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <Button
                        type="submit"
                        className="relative"
                        disabled={isLoading}
                    >
                        Send Recovery Email
                        {isLoading && (
                            <span className="animate-spin absolute right-4">
                                <LoaderIcon />
                            </span>
                        )}

                        <output aria-live="polite" className="sr-only">
                            {isLoading ? 'Loading' : 'Submit form'}
                        </output>
                    </Button>
                    <p className="mt-6 text-center text-sm text-gray-500">
                        Remembered your password?{" "}
                        <a href="/login" className="text-blue-600 hover:underline">
                            Sign In
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}

'use client';

import {useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoaderIcon } from '@/components/icons';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { recoverPassword } from '../recoverPassword/api';
import bird from '../../../public/bird.jpg'
import Image from 'next/image';

export default function ResetPage() {
    const [isSuccessful, setIsSuccessful] = useState(false);
    const searchParams = useSearchParams();
    const email = searchParams.get('email')


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (email) {
            try {
                setIsSuccessful(true)
                const response = await recoverPassword(email)
                if (response?.message) {
                    toast.success('Recovery email sent successfully!');
                }
            } catch (e) {
                console.error(e)
                toast.success('Failed to reset password!');
            } finally {
                setIsSuccessful(false);
            }
        }
    };

    return (
        <div style={{backgroundColor:'white'}} className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
            <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
                <div className="flex h-screen items-center justify-center">
                    <div className="w-full max-w-md bg-white p-8 text-center">
                        {/* Illustration */}
                        <div className="flex justify-center ">
                            <div className=" rounded-full bg-green-100 flex items-center justify-center">
                                <Image src={bird} alt='' height={200} width={200}></Image>
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-semibold dark:text-zinc-50 mb-4">Recovery email sent</h3>
                        {/* Description */}
                        <p className="text-sm text-gray-500 mb-6">
                            Didn't receive the email? Please check the email address you used to make sure it matches
                            the address on your account. Look in your spam folder, or request another email below.
                        </p>

                        {/* Button */}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
                            <Button type="submit" className="relative">
                                Send again
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

            </div>
        </div>
    );
}

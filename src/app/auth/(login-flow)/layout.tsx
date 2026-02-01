'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from "next/navigation";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  const router = useRouter()
  const [envDriven,setEnvDriven] = useState(true)
  
  useEffect(() => {
    setEnvDriven(process.env.NEXT_PUBLIC_ENV_DRIVEN === 'true');
  }, []);

  const handleManageConfiguration = () => {
    router.push('/settings')
  }

  return (
    <div className="px-12 py-7 min-h-screen bg-cover bg-center bg-[url('/login_gradient.jpg')]">
      
      {/* Logo */}
      <div className="relative h-7 w-28 mx-auto md:mx-0">
        <Image src='/ejentoLogo.png' alt='ejento logo' fill className="object-contain"/>
      </div>

      {
        !envDriven && 
        <div className='absolute top-6 right-6'>
          <Button onClick = {handleManageConfiguration} size="sm" variant="outline" className='p-4'>
              Manage Configuration
          </Button>
        </div>
      }

      {/* Page content */}
      {children}
    </div>
  )
}

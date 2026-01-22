'use client'

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const Verification = () => {
    const router = useRouter()

    useEffect( () => {
        router.push('/chat')
    },[])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 shadow-lg">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-700">
          Please wait while you are being verified
        </p>
      </div>
    </div>
  );
};

export default Verification;

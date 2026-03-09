'use client';

import { useConfig } from "@/app/context/ConfigContext";
import { useApiService } from "@/hooks/useApiService";
import { Button } from "@/components/ui/button";
import { ConfigError } from "../configError";
import { toast } from "sonner";
import LoginSkeleton from "./LoginSkeleton";
import { useState } from "react";
import { Spinner } from "../ui/spinner";

interface SSOButtonProps {
  icon: React.ReactNode;
  label: string;
  name: string;
  className?: string;
}

export default function SSOButton({ icon, label, name, className }: SSOButtonProps) {

  let url_name = name.split('_')

  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();
  const [isLoading, setIsLoading] = useState(false)

  // Show message if no config after loading
  if (!apiService && !configLoading) {
    //although config is validated before login but for safe side we are checking it here 
    return <ConfigError/>;
  }
  
  const handleClick = async () => {
    try{

      setIsLoading(true)
      const result = await apiService?.SSO_PROVIDER(url_name[0])
      if(result){
        window.location.href = result
      }
      else{
        toast.error('Something went wrong')
        setIsLoading(false)
      }
    }
    catch(error){
      toast.error('Something went wrong')
      setIsLoading(false)
    }
  };

  return (
    <Button
      className={`flex items-center justify-between w-full bg-black rounded-xl px-4 py-2 h-11 hover:bg-black/85 relative ${className || ''}`}
      onClick={handleClick}
      disabled = {isLoading}
    >
      {icon}
        <div className="absolute left-0 right-0 text-center md:text-[14px] text-xs">{label}</div>
        { isLoading && <Spinner/> }
    </Button>
  );
}

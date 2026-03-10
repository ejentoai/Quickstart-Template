"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useConfig } from "@/app/context/ConfigContext";
import { useApiService } from "@/hooks/useApiService";
import { setAccessToken, setEjentoAccessToken } from "@/cookie";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { toast } from "sonner";

interface OtpInputProps {
  readonly otp_session_id : string;
  readonly setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function OtpInput({otp_session_id,setLoading} : OtpInputProps) {
  const [value, setValue] = useState("");
  const length = 6; //length of otp code
  const [isVerifying, setIsVerifying] = useState(false)
  const router = useRouter();
  const { isLoading: configLoading } = useConfig();
  const apiService = useApiService();

  useEffect(() => {
    if (configLoading || !apiService) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [configLoading, apiService]);

  useEffect( () => {
     if( value.length !== 6){
      setIsVerifying(false)
      return
     }    
    async function VerifyOtp(){
      try{ 
        setIsVerifying(true)
        const result = await apiService?.validateOtp(otp_session_id,value);
           if(result?.success){
            setAccessToken(result.data.data.access_token)
            setEjentoAccessToken(result.data.data.ejento_access_token)
            router.push('/auth/userData') //to extract the user data after successful login
           }
           else{
              toast.error(result?.message)
              setIsVerifying(false)
              setValue("")
           }
      }
      catch(error){
        console.error(error)
      }
    }
    VerifyOtp()
     
  }, [value,apiService] )

  const handlePaste = (e: React.ClipboardEvent) => {

    if(isVerifying){
       e.preventDefault()
       return
    }
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text/plain');
    
    // Remove special characters (dashes, spaces, punctuation) but keep letters and numbers
    // This regex removes: spaces, dashes, underscores, dots, commas, etc.
    const cleanedText = pastedText.replace(/[\s\-_.,;:!@#$%^&*()+="]/g, '');
    
    const newValue = cleanedText.slice(0, length);
    
    setValue(newValue);
  };

  const handleChange = async (newValue: string) => {
    if(isVerifying){
        return
    }
    setValue(newValue);
  };

  return (
    <div className="mb-10">
      <div className="flex justify-center mt-4 mb-5">
      <InputOTP
        maxLength={length}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        disabled = {isVerifying}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      >
        <InputOTPGroup>
          {[0, 1, 2].map((item) => (
            <InputOTPSlot
              key={item}
              index={item}
              className={`border-[#99A1AF] md:h-14 md:w-14 h-11 w-11 ppercase text-[#3B4055] font-semibold text-xl ${isVerifying ? "opacity-70 cursor-not-allowed" : ''} `}
            />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {[3, 4, 5].map((item) => (
            <InputOTPSlot
              key={item}
              index={item}
              className={`border-[#99A1AF] md:h-14 md:w-14 h-11 w-11 uppercase text-[#3B4055] font-semibold text-xl ${isVerifying ? "opacity-70 cursor-not-allowed" : ''} `}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
    {
        isVerifying && 
        <div className="flex gap-2 justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500"/>
            <p className="text-gray-500 text-sm">verifying your code...</p>
        </div>
    }
    </div>
    
  );
}
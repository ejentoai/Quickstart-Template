import React from "react";
import ejentoLogo from '../../../public/ejentologo.png'
import Image from 'next/image';


const StaticLogo = () => {
  const headerText = process.env.NEXT_PUBLIC_AGENT_HEADER_TEXT?.trim();
  const agentImageUrl = process.env.NEXT_PUBLIC_AGENT_IMAGE?.trim();
  const showText = !!headerText;

  // Determine which image to use: env variable image or fallback to ejentoLogo
  const imageSrc = agentImageUrl || ejentoLogo;
  const imageAlt = agentImageUrl ? "Header Image" : "Ejento Logo";
  const isExternalImage = !!agentImageUrl;
  
  // For external images, ensure we have a string URL
  const externalImageUrl = agentImageUrl || undefined;

  return (
    <div
      className="flex flex-col items-center justify-center text-center h-[30dvh]"
    >
      <div
        className="
          flex justify-center items-center relative 
          w-full max-w-full
          min-h-[150px] px-4
        "
      >
        {showText ? (
          <>
          <h1 className="text-2xl md:text-4xl font-semibold text-gray-700 leading-snug break-words">
            {headerText}
          </h1>
          
          </>
        ) : isExternalImage ? (
          <img
            src={externalImageUrl}
            alt={imageAlt}
            className="w-full max-w-[500px] h-auto object-contain m-auto"
          />
        ) : (
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full max-w-[500px] h-auto object-contain m-auto"
            priority
          />
        )}
      </div>
    </div>
  );
};
export default StaticLogo;
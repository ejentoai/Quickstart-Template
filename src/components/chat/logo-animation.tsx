import React from "react";
import { motion } from "motion/react";

// import colorSvg from "./assets/color.svg";
// import monoSvg from "./assets/monochrome.svg";

type SvgTransitionProps = {
  colorSvg: string; // Expected to be a string, probably an SVG path or data.
  monoSvg: string; // Another string for SVG path or data.
  inputText: string; // Text to reveal in the SVG.
  isTextFieldSelected: boolean; // Boolean to determine if the text field is selected.
  maxCharacters?: number; // Optional number with a default value of 50.
  forceComplete?: boolean; // Optional boolean to force completion.
};

const SvgTransition = ({
  colorSvg,
  monoSvg,
  inputText,
  isTextFieldSelected,
  maxCharacters = 50,
  forceComplete,
}: SvgTransitionProps) => {
  // Calculate reveal percentage
  const revealPercentage = forceComplete
    ? 100 // Force completion when submit is clicked
    : Math.min((inputText.length / maxCharacters) * 100, 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "30dvh",
        textAlign: "center",
      }}
    >
      {/* SVG Wrapper */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          width: "325px", // Increase size if glow is large
          height: "275px",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "310px", // Increase size if glow is large
            height: "255px", // Increase size if glow is large
            overflow: "visible", // Prevent glow clipping
          }}
        >
          {/* Monochrome SVG */}
          <div
            dangerouslySetInnerHTML={{ __html: monoSvg }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              padding: "0.5rem",
              filter: isTextFieldSelected
                ? "brightness(1.1)"
                : "brightness(1.0)", // Invert colors
              opacity: revealPercentage > 50 ? 0 : 1, // Hide when fully revealed
              transition: "filter 0.5s ease-in-out, opacity 0.5s ease-in-out", // Smooth transition
            }}
          />

          {/* Animated Color SVG */}
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.5rem",
              overflow: "hidden",
              maskImage:
                "radial-gradient(circle, black 100%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 100%, transparent 100%)",
              opacity: 0, // Initial opacity
              scale: 1.04, // Initial scale
              // filter:
              //   revealPercentage === 100
              //     ? "drop-shadow(0 0 1px rgba(16, 163, 127, 0.8)) drop-shadow(0 0 10px rgba(16, 163, 127, 0.6))"
              //     : "none", // Add glow when fully revealed
              // transition: "filter 0.5s ease-in-out", // Smooth glow transition
            }}
            animate={{
              maskSize: `${revealPercentage}% ${revealPercentage}%`,
              WebkitMaskSize: `${revealPercentage}% ${revealPercentage}%`,
              opacity: revealPercentage / 100, // Fade in as the reveal percentage increases
            }}
            transition={{
              duration: 0.5, // Smooth transition duration
              ease: "easeInOut", // Easing function for smooth fading
            }}
            dangerouslySetInnerHTML={{ __html: colorSvg }}
          />
        </div>
      </div>
    </div>
  );
};

export default SvgTransition;

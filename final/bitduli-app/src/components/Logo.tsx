import React from "react";

interface LogoProps {
  color?: string; // Hex color or class name
  size?: number;   // Width/height
  className?: string;
  animate?: boolean;
}

export default function Logo({ color = "#333333", size = 120, className = "", animate = true }: LogoProps) {
  return (
    <div 
      className={`relative inline-block ${animate ? "animate-soft-wiggle" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main hand-drawn contour of the head: slightly crooked, flattened on top-left, wider on right */}
        <path
          d="M 33 18 
             C 12 18, 5 45, 10 65
             C 15 80, 42 90, 60 88
             C 80 85, 87 65, 85 45
             C 83 25, 55 16, 33 18 Z"
          stroke={color}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Overlapping double-line sketchy stroke on the bottom-right for the hand-drawn/crayon feel */}
        <path
          d="M 50 83 
             C 65 80, 83 72, 82 48
             C 81 28, 62 19, 45 18"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* 3 Hair strands at the top - matched precisely to the charcoal image */}
        {/* Left hair strand (slightly tilted left, double stroke) */}
        <path
          d="M 35 18 Q 32 9 32 6"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 37 18 Q 35 11 34 8"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Middle hair strand (almost straight, slightly tilted right) */}
        <path
          d="M 50 15 Q 50 8 50 4"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M 52 15 Q 52 9 52 5"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Right hair strand (longer, curved sharply out to the right) */}
        <path
          d="M 64 19 Q 74 13 78 8"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 63 21 Q 72 15 75 11"
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/* Left eye: small tilted sketchy rectangle/ellipse, slightly lower than the right eye */}
        <g transform="translate(24, 45) rotate(5)">
          <ellipse cx="2.5" cy="3.5" rx="2.5" ry="3.5" fill={color} />
          {/* Subtle sketchy texture overlay */}
          <path d="M 0 2 L 5 5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* Right eye: slightly higher and larger, tilted slightly */}
        <g transform="translate(61, 38) rotate(-10)">
          <ellipse cx="3" cy="4" rx="3" ry="4" fill={color} />
          <path d="M 0 3 L 6 5" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* Shaky mouth smile: placed in the bottom right, tilted upwards */}
        <path
          d="M 43 66 
             C 48 68, 56 68, 60 56"
          stroke={color}
          strokeWidth="4.2"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 42 65 
             C 47 67, 54 67, 58 58"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />
      </svg>
    </div>
  );
}

import React from "react";
import Image from "next/image";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const Logo = ({ className = "", size = "md" }: LogoProps) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-20 h-20",
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <Image
        src="/logo.png"
        alt="Infocusp Resumes"
        width={size === "sm" ? 24 : size === "md" ? 32 : 80}
        height={size === "sm" ? 24 : size === "md" ? 32 : 80}
        className="w-full h-full object-contain"
        priority={false}
        loading="lazy"
      />
    </div>
  );
};

export default Logo;

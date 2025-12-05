import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface OrangeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export function OrangeButton({
    children,
    className,
    ...props
}: OrangeButtonProps) {
    const [isHover, setIsHover] = useState(false);
    const [isActive, setIsActive] = useState(false);

    const isOrange = isHover || isActive;

    return (
        <button
            className={`
                relative
                px-10 py-3 mt-2
                font-semibold
                rounded-full
                flex flex-row items-center
                cursor-pointer
                bg-card/50
                text-foreground
                transition-all duration-200
                ${isOrange ? "text-orange-100" : ""}
                hover:scale-100
                active:scale-95
                ${className || ""}
            `}
            style={
                isOrange
                    ? {
                          background:
                              "linear-gradient(180deg, #FF7017 0%, #FF8B42 100%)",
                          boxShadow: `
                              inset 0px 4px 8px 0px #FF7348,
                              inset 0px -4px 8px 0px #DE3B00,
                              0px 8px 20px -4px rgba(255, 112, 23, 0.5),
                              0px 4px 8px -2px rgba(0, 0, 0, 0.15)
                          `,
                          borderColor: "transparent",
                      }
                    : undefined
            }
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => {
                setIsHover(false);
                setIsActive(false);
            }}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            {...props}
        >
            {children}
        </button>
    );
}

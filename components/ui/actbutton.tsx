import type { ButtonHTMLAttributes, ReactNode } from "react";

interface OrangeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export function OrangeButton({
    children,
    className,
    ...props
}: OrangeButtonProps) {
    return (
        <button
            className={`
        relative
        px-10 py-3 mt-2
        text-orange-100 font-semibold
        rounded-full
        flex flex-row items-center
        cursor-pointer
        transition-all duration-200
        hover:scale-105
        active:scale-95
        ${className || ""}
      `}
            style={{
                background: "linear-gradient(180deg, #FF7017 0%, #FF8B42 100%)",
                boxShadow: `
          inset 0px 4px 8px 0px #FF7348,
          inset 0px -4px 8px 0px #DE3B00,
          0px 8px 10px -4px rgba(255, 112, 23, 0.2),
          0px 4px 8px -2px rgba(0, 0, 0, 0.15)
        `,
            }}
            {...props}
        >
            {children}
        </button>
    );
}

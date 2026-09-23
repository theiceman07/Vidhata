"use client";

import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

/** A password field with a show/hide toggle inside it. */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(function PasswordInput({ className, ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        ref={ref}
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-1 my-auto flex h-9 w-9 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-parchment hover:text-ink"
      >
        <Icon name={visible ? "visibility_off" : "visibility"} size={20} />
      </button>
    </div>
  );
});

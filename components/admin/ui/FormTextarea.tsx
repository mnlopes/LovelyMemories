import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    helperText?: string;
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
    ({ className, label, error, helperText, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                <label className="text-sm font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{label}</label>
                <textarea
                    ref={ref}
                    className={cn(
                        "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none transition-all min-h-[120px] resize-none",
                        "focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white focus:ring-1 focus:ring-[#171717] dark:focus:ring-white",
                        "placeholder:text-[#a3a3a3] dark:placeholder:text-admin-dark-text-secondary/50",
                        error && "border-red-500 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500 font-bold",
                        className
                    )}
                    {...props}
                />
                {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                {helperText && !error && <p className="text-[10px] text-[#a3a3a3] font-medium uppercase tracking-wider">{helperText}</p>}
            </div>
        );
    }
);
FormTextarea.displayName = "FormTextarea";

export { FormTextarea };

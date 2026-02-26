import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    error?: string;
    helperText?: string;
    placeholder?: string;
    options: { label: string; value: string | number }[];
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
    ({ className, label, error, helperText, options, placeholder, ...props }, ref) => {
        return (
            <div className="space-y-1.5 w-full">
                <label className="text-sm font-bold text-[#a3a3a3] dark:text-admin-dark-text-secondary uppercase tracking-wider">{label}</label>
                <div className="relative">
                    <select
                        ref={ref}
                        className={cn(
                            "w-full bg-[#fafafa] dark:bg-admin-dark-bg border border-[#f5f5f5] dark:border-admin-dark-border rounded-xl px-4 py-3 text-sm text-[#171717] dark:text-admin-dark-text-primary outline-none transition-all appearance-none",
                            "focus:bg-white dark:focus:bg-admin-dark-surface focus:border-[#171717] dark:focus:border-white focus:ring-1 focus:ring-[#171717] dark:focus:ring-white",
                            error && "border-red-500 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500",
                            className
                        )}
                        {...props}
                    >
                        <option value="" disabled className="dark:bg-admin-dark-surface">
                            {placeholder || "Select an option"}
                        </option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value} className="dark:bg-admin-dark-surface dark:text-admin-dark-text-primary">
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    {/* Chevron Icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#a3a3a3] dark:text-admin-dark-text-secondary">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
                {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                {helperText && !error && <p className="text-[10px] text-[#a3a3a3] font-medium uppercase tracking-wider">{helperText}</p>}
            </div>
        );
    }
);
FormSelect.displayName = "FormSelect";

export { FormSelect };

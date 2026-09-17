import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, id, className = '', rightElement, ...props }, ref) => {
        return (
            <div className="w-full text-left">
                {label && (
                    <label htmlFor={id} className="block text-[14px] font-medium text-gray-600 mb-1.5 ml-0.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    <input
                        id={id}
                        ref={ref}
                        className={`w-full bg-[#f1f5f9] border border-gray-200/50 px-4 py-3 rounded-lg text-gray-900 transition-all focus:outline-none focus:border-brand-red/30 focus:bg-white placeholder-gray-400/60 text-[15px] ${rightElement ? 'pr-12' : ''
                            } ${className}`}
                        {...props}
                    />
                    {rightElement && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300">
                            {rightElement}
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

Input.displayName = 'Input';

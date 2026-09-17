import React from 'react';
import { GlobalClock } from '../components/ui/GlobalClock';

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="h-screen flex items-center justify-center bg-white p-4 selection:bg-brand-red selection:text-white overflow-hidden relative">
            <div className="absolute top-4 right-8 z-50 hidden md:block">
                <GlobalClock />
            </div>
            <div className="w-full max-w-[600px]">
                {children}
            </div>
        </div>
    );
}

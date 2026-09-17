import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AccessDenied: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleGoBack = () => {
        if (user) {
            navigate(`/dashboard/${user.id}/overview`);
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="h-full w-full flex items-center justify-center bg-[#F9FAFB] p-6">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldOff size={40} className="text-brand-red" />
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
                    Access Denied
                </h1>

                <p className="text-gray-500 text-[15px] font-medium mb-8 leading-relaxed">
                    You don't have permission to access this page. This feature is only available to super administrators.
                </p>

                <button
                    onClick={handleGoBack}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-brand-red hover:bg-brand-red-hover text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-red/20 active:scale-95"
                >
                    <ArrowLeft size={20} />
                    Return to Dashboard
                </button>
            </div>
        </div>
    );
};

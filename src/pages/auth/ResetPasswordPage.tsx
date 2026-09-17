import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { authService } from '../../services/authService';
import AuthLayout from '../../layouts/AuthLayout';

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';
    const emailParam = searchParams.get('email') || '';

    const [email, setEmail] = useState(emailParam);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        document.title = 'EdgeStone - Reset Password';
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [emailParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError('Missing password reset token. Please request a new password reset link.');
            return;
        }

        if (!email) {
            setError('Email address is required.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match. Please re-enter.');
            return;
        }

        try {
            setIsLoading(true);
            await authService.resetPassword(email, token, password);
            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. The link may be expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout>
            <div className="flex flex-col items-center">
                {/* Logo Section */}
                <div className="mb-4">
                    <img
                        src="/assets/logo.png"
                        alt="EdgeStone Logo"
                        className="h-16 w-auto"
                    />
                </div>

                {/* Card Container */}
                <div className="bg-white px-6 sm:px-12 py-10 rounded-2xl shadow-[0_1px_5px_rgba(0,0,0,0.05)] border border-gray-100 w-full max-w-[500px]">
                    {!token ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 bg-red-50 text-brand-red rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <AlertCircle size={28} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                This password reset link is missing a valid security token or has expired.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-brand-red hover:bg-brand-red-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-red/20"
                            >
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    ) : isSuccess ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-100">
                                <CheckCircle2 size={28} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                Your account password has been safely updated. You can now log in with your new password.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-600/20 active:scale-95"
                            >
                                Proceed to Sign In
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-12 h-12 bg-red-50 text-brand-red rounded-xl flex items-center justify-center mx-auto mb-3 border border-red-100/60">
                                    <Lock size={22} strokeWidth={2.2} />
                                </div>
                                <h1 className="text-[26px] font-bold text-[#2D3748] mb-2">Set New Password</h1>
                                <p className="text-[14px] text-gray-500">
                                    Enter your new password below to regain access
                                </p>
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-brand-red/20 text-brand-red rounded-xl">
                                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                                    <p className="text-[13px] font-semibold leading-snug">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all"
                                        placeholder="your.email@edgestone.in"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 pr-12 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all"
                                            placeholder="Minimum 6 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            minLength={6}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 pr-12 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all"
                                            placeholder="Re-enter password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full py-4 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-base rounded-xl transition-all shadow-lg shadow-brand-red/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Updating Password...
                                            </>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </button>
                                </div>

                                <div className="text-center pt-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand-red transition-colors"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Sign In
                                    </Link>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </AuthLayout>
    );
}

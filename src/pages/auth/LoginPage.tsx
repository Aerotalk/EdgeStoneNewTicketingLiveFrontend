import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, KeyRound, X } from 'lucide-react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import AuthLayout from '../../layouts/AuthLayout'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/authService'

// Dummy Support Agents with Roles


export default function LoginPage() {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [rememberMe, setRememberMe] = useState(true)

    // Forgot password modal state
    const [showForgotModal, setShowForgotModal] = useState(false)
    const [forgotEmail, setForgotEmail] = useState('')
    const [isForgotLoading, setIsForgotLoading] = useState(false)
    const [forgotError, setForgotError] = useState<string | null>(null)
    const [forgotSuccess, setForgotSuccess] = useState(false)

    useEffect(() => {
        document.title = 'EdgeStone - Login';
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setIsSuccess(false)
        setIsLoading(true)

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Store user data in AuthContext

                console.log('Login Response Data:', data);
                console.log('Access Object:', data.access);
                console.log('Is SuperAdmin (Access):', data.access?.superAdmin);

                // Determine role based on access rights or direct role property
                const userRole: any = (data.access?.superAdmin || data.isSuperAdmin) ? 'Super admin' : (data.role === 'Super admin' || data.role === 'super_admin' ? 'Super admin' : data.role || 'agent');
                console.log('Determined Role:', userRole);

                // Store user data in AuthContext
                login({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    role: userRole,
                    token: data.token
                })

                setIsSuccess(true)
                setIsLoading(false)
                // Redirect after a short delay
                setTimeout(() => {
                    if (userRole === 'Super admin') {
                        navigate(`/dashboard/${data.id}/assign-agents`)
                    } else {
                        navigate(`/dashboard/${data.id}`)
                    }
                }, 1500)
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during login.')
            setIsLoading(false)
        }
    }

    const handleForgotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError(null);
        setIsForgotLoading(true);
        try {
            await authService.forgotPassword(forgotEmail);
            setForgotSuccess(true);
        } catch (err: any) {
            setForgotError(err.message || 'Failed to send password reset request');
        } finally {
            setIsForgotLoading(false);
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

                {/* Login Card */}
                <div className="bg-white px-6 sm:px-12 py-10 rounded-xl shadow-[0_1px_5px_rgba(0,0,0,0.05)] border border-gray-100 w-full max-w-[500px]">
                    <h1 className="text-[28px] font-bold mb-3 text-center text-[#2D3748]">Login to Account</h1>
                    <p className="text-[14px] text-gray-500 text-center mb-8">Please enter your email and password to continue</p>

                    {/* Status Messages */}
                    <div className={`${(error || isSuccess) ? 'mb-6' : 'h-0 invisible'}`}>
                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 border border-brand-red/20 text-brand-red rounded-lg">
                                <AlertCircle size={18} />
                                <p className="text-[13px] font-semibold">{error}</p>
                            </div>
                        )}
                        {isSuccess && (
                            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 text-green-600 rounded-lg">
                                <CheckCircle2 size={18} />
                                <p className="text-[13px] font-semibold">Login successful! Redirecting...</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-7">
                        <div>
                            <Input
                                label="Email address:"
                                type="email"
                                id="email"
                                placeholder="esteban_schiller@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading || isSuccess}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password" title="Password" className="text-[14px] font-medium text-gray-600 ml-0.5">
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setForgotEmail(email || '');
                                        setForgotError(null);
                                        setForgotSuccess(false);
                                        setShowForgotModal(true);
                                    }}
                                    className="text-[14px] font-medium text-gray-400 hover:text-brand-red transition-colors"
                                >
                                    Forget Password?
                                </button>
                            </div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading || isSuccess}
                                rightElement={
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="p-1 hover:text-brand-red transition-colors"
                                        disabled={isLoading || isSuccess}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                }
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                                    disabled={isLoading || isSuccess}
                                />
                            </div>
                            <label htmlFor="remember" className="text-[14px] text-gray-500 font-medium cursor-pointer">
                                Remember Password
                            </label>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                isLoading={isLoading}
                                disabled={isSuccess}
                                className={isSuccess ? "bg-green-600 w-full py-4 rounded-lg" : "bg-brand-red hover:bg-brand-red-hover w-full py-4 rounded-lg text-white font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-brand-red/20"}
                            >
                                {isSuccess ? "Redirecting..." : "Sign In"}
                            </Button>
                        </div>

                    </form>
                </div>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-7 relative animate-scaleUp">
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="w-12 h-12 bg-red-50 text-brand-red rounded-xl flex items-center justify-center mb-4 border border-red-100/60">
                            <KeyRound size={22} strokeWidth={2.2} />
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">Forgot Password?</h2>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            Enter the email associated with your account and we'll send a password reset link.
                        </p>

                        {forgotError && (
                            <div className="flex items-start gap-2.5 p-3.5 mb-5 bg-red-50 border border-brand-red/20 text-brand-red rounded-xl text-xs font-semibold">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                <span>{forgotError}</span>
                            </div>
                        )}

                        {forgotSuccess ? (
                            <div className="text-center py-4">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 border border-green-100">
                                    <CheckCircle2 size={24} />
                                </div>
                                <h4 className="text-base font-bold text-gray-900 mb-1">Reset Link Sent!</h4>
                                <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                                    If an account exists for <span className="font-bold text-gray-700">{forgotEmail}</span>, instructions have been sent. Please check your inbox.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(false)}
                                    className="w-full py-3 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-md"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        required
                                        placeholder="your.email@edgestone.in"
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-brand-red focus:ring-4 focus:ring-brand-red/5 transition-all"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isForgotLoading}
                                        className="flex-1 py-3 bg-brand-red hover:bg-brand-red-hover text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-red/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                    >
                                        {isForgotLoading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </AuthLayout>
    )
}

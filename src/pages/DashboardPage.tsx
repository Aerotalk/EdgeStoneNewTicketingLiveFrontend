import { useNavigate } from 'react-router-dom'
import { Sidebar } from '../components/ui/Sidebar'

export default function DashboardPage() {
    const navigate = useNavigate();
    
    const userStr = localStorage.getItem('edgestone_user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tighter">401</h1>
                    <p className="text-gray-600 mb-6 font-medium">Authentication required.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-brand-red font-bold hover:underline uppercase text-sm tracking-widest"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        )
    }

    const agentName = user.name || 'Support Agent';

    return (
        <div className="min-h-screen bg-white flex font-sans selection:bg-brand-red selection:text-white">
            {/* Sidebar Component */}
            <Sidebar agentName={agentName} />

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-8">
                    {/* Workspace Card */}
                    <div className="bg-white p-8 rounded-lg border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <span className="text-brand-red font-bold text-[10px] uppercase tracking-[0.3em] mb-4 block">Workspace / Overview</span>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome, {agentName}</h1>
                        <p className="text-gray-500 font-medium max-w-md leading-relaxed text-[15px]">
                            Your operational panel is ready. Use the sidebar to navigate between tickets, clients, and vendor management.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

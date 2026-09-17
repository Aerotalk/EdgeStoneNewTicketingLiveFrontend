import React, { useState, useEffect } from 'react';
import { FileText, X, Save, Edit3, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GlobalStickyNoteProps {
    isOpen?: boolean;
    onClose?: () => void;
    showFloatingButton?: boolean;
}

export const GlobalStickyNote: React.FC<GlobalStickyNoteProps> = ({
    isOpen: controlledIsOpen,
    onClose,
    showFloatingButton
}) => {
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;
    const setIsOpen = (val: boolean) => {
        if (controlledIsOpen !== undefined) {
            if (!val && onClose) onClose();
        } else {
            setLocalIsOpen(val);
        }
    };
    const [content, setContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdatedBy, setLastUpdatedBy] = useState('');
    const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

    const toggleOpen = () => setIsOpen(!isOpen);

    useEffect(() => {
        if (isOpen) {
            fetchNote();
        }
    }, [isOpen]);

    const fetchNote = async () => {
        setIsLoading(true);
        try {
            const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/global-note`;
            const userStr = localStorage.getItem('edgestone_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token || '';
            
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContent(data.content || '');
                setLastUpdatedBy(data.updatedBy || '');
                setLastUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : null);
            }
        } catch (error) {
            console.error('Failed to fetch global note:', error);
            toast.error('Failed to sync sticky note');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const API_URL = `${import.meta.env.VITE_API_BASE_URL}/api/global-note`;
            const userStr = localStorage.getItem('edgestone_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token || '';
            
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const data = await response.json();
                setContent(data.content);
                setLastUpdatedBy(data.updatedBy);
                setLastUpdatedAt(new Date(data.updatedAt));
                toast.success('Handover note saved globally');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Failed to save note:', error);
            toast.error('Failed to save sticky note');
        } finally {
            setIsSaving(false);
        }
    };

    const isControlled = controlledIsOpen !== undefined;
    const finalShowFloatingButton = showFloatingButton ?? !isControlled;

    return (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <div
                    className={`${finalShowFloatingButton ? 'mb-4' : ''} bg-[#FFFDF0] border border-yellow-200/60 shadow-2xl rounded-xl w-80 overflow-hidden flex flex-col transition-all duration-200 ease-out`}
                    style={{
                        boxShadow: '0 20px 40px -10px rgba(253, 224, 71, 0.2), 0 10px 20px -5px rgba(0,0,0,0.05)'
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-yellow-300 to-yellow-200 p-3 flex justify-between items-center border-b border-yellow-300/50">
                        <div className="flex items-center gap-2">
                            <FileText size={16} className="text-yellow-800" />
                            <span className="font-bold text-yellow-900 text-sm">Shift Handover</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="p-1.5 text-yellow-800 hover:bg-yellow-400/30 rounded-md transition-colors"
                                title="Save globally"
                            >
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            </button>
                            <button
                                onClick={toggleOpen}
                                className="p-1.5 text-yellow-800 hover:bg-yellow-400/30 rounded-md transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 flex-1 relative">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-[#FFFDF0]/80 backdrop-blur-sm z-10">
                                <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                            </div>
                        ) : null}
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onBlur={handleSave}
                            placeholder="Type handover notes here..."
                            className="w-full h-64 bg-transparent resize-none text-gray-800 focus:outline-none placeholder:text-yellow-600/40 font-medium leading-relaxed custom-scrollbar"
                            style={{
                                backgroundImage: 'linear-gradient(transparent, transparent 27px, rgba(234, 179, 8, 0.1) 28px)',
                                backgroundSize: '100% 28px',
                                lineHeight: '28px'
                            }}
                        />
                    </div>

                    {/* Footer */}
                    {lastUpdatedAt && (
                        <div className="bg-yellow-50/50 p-2.5 text-[11px] text-yellow-700/80 border-t border-yellow-200/50 flex justify-between items-center px-4">
                            <span>Updated by {lastUpdatedBy || 'Unknown'}</span>
                            <span>{lastUpdatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                </div>
            )}

            {finalShowFloatingButton && (
                <button
                    onClick={toggleOpen}
                    className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
                    <Edit3 size={24} strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
};

import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title: string;
    itemName: string;
    itemType: 'Ticket' | 'Circuit' | 'Client' | 'Vendor';
    onConfirm: () => Promise<void> | void;
    onClose: () => void;
    isLoading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    title,
    itemName,
    itemType,
    onConfirm,
    onClose,
    isLoading = false
}) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 text-center transform transition-all animate-scaleUp"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Warning Icon Badge */}
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-brand-red shadow-sm">
                    <Trash2 size={26} strokeWidth={2.2} />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {title || `Delete ${itemType}`}
                </h3>

                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-bold text-gray-900 break-all">{itemName}</span>?
                </p>

                <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-3 mb-6 flex items-start gap-2 text-left">
                    <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                        This action is irreversible. All linked historical logs and data will be cleaned up.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 py-2.5 px-4 bg-brand-red hover:bg-brand-red-hover text-white text-sm font-bold rounded-xl shadow-lg shadow-brand-red/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            <>
                                <Trash2 size={16} />
                                Delete
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

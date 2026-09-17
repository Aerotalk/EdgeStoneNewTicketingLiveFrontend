import React from 'react';
import { Mail, MessageSquare, Calendar, Trash2 } from 'lucide-react';
import { formatDateIST } from '../../utils/dateUtils';

interface TicketCardProps {
    name: string;
    ticketId: string;
    email: string;
    header: string;
    date: string;
    priority?: string;
    onReply?: () => void;
    onDelete?: () => void;
}

const PriorityBars = ({ priority }: { priority: string }) => {
    const configs: Record<string, { bars: boolean[]; color: string }> = {
        High: { bars: [true, true, true], color: '#EF4444' },
        Medium: { bars: [true, true, false], color: '#F59E0B' },
        Low: { bars: [true, false, false], color: '#22C55E' },
    };

    const cfg = configs[priority];
    if (!cfg) return null;

    return (
        <div className="flex items-end gap-[2.5px] h-4 flex-shrink-0">
            {cfg.bars.map((active, i) => (
                <div
                    key={i}
                    className="w-[3.5px] rounded-full transition-all duration-300"
                    style={{
                        backgroundColor: active ? cfg.color : '#E5E7EB',
                        height: i === 0 ? '6px' : i === 1 ? '10px' : '14px',
                    }}
                />
            ))}
        </div>
    );
};

export const TicketCard: React.FC<TicketCardProps> = ({
    name,
    ticketId,
    email,
    header,
    date,
    priority,
    onReply,
    onDelete
}) => {
    // Extract initials from name
    const getInitials = (fullName: string) => {
        const names = fullName.split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.slice(0, 2).toUpperCase();
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#E5DCC3] flex items-center justify-center text-[#5C5648] font-bold text-lg">
                    {getInitials(name)}
                </div>
                <h3 className="text-[17px] font-bold text-gray-900">{name}</h3>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-4">
                    <span className="inline-block bg-[#F5F2F9] text-[#A688C4] text-[12px] font-bold px-2 py-1 rounded-md">
                        {ticketId ? (ticketId.startsWith('#') ? ticketId : `#${ticketId}`) : ''}
                    </span>

                    {/* Priority badge — shown only when set */}
                    {priority && (
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                            <PriorityBars priority={priority} />
                            <span
                                className="text-[11px] font-bold"
                                style={{
                                    color:
                                        priority === 'High' ? '#EF4444' :
                                            priority === 'Medium' ? '#F59E0B' :
                                                '#22C55E',
                                }}
                            >
                                {priority}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 uppercase">
                        <Calendar size={14} className="text-gray-300" />
                        {formatDateIST(date, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <Mail size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[14px] text-gray-700 underline decoration-gray-300 underline-offset-4 font-medium truncate">
                            {email}
                        </span>
                    </div>
                    <div className="flex items-start gap-3">
                        <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[14px] text-gray-400 font-medium line-clamp-1">
                            {header}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
                <button
                    onClick={onReply}
                    className="flex-1 py-2.5 border border-gray-900 rounded-xl flex items-center justify-center gap-2 text-[14px] font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                    <Mail size={16} strokeWidth={2.5} />
                    Reply
                </button>
                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-2.5 border border-gray-200 text-gray-400 hover:text-brand-red hover:border-brand-red/30 hover:bg-brand-red/5 rounded-xl transition-all"
                        title="Delete Ticket"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

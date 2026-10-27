import React from 'react';
import { Mail, MessageSquare, Calendar, Trash2, Zap, Clock, AlertCircle } from 'lucide-react';
import { formatDateIST } from '../../utils/dateUtils';

interface TicketCardProps {
    name: string;
    ticketId: string;
    email: string;
    header: string;
    date: string;
    priority?: string;
    ticketType?: string;
    isMaintenance?: boolean;
    circuitId?: string;
    latestActivityDate?: string;
    latestActivityType?: 'client' | 'vendor' | 'agent';
    needsAction?: boolean;
    awaitingResponse?: boolean;
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
    ticketType,
    isMaintenance,
    circuitId,
    latestActivityDate,
    needsAction,
    awaitingResponse,
    onReply,
    onDelete
}) => {
    // Extract initials from name
    const getInitials = (fullName: string) => {
        const names = (fullName || 'Unknown').split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.slice(0, 2).toUpperCase();
    };

    const isMaint = isMaintenance || ticketType === 'Vendor';

    return (
        <div
            onClick={onReply}
            className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
            <div>
                {/* Header Row: Initials, Name, and Classification Badge */}
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-base flex-shrink-0 ${
                            isMaint ? 'bg-amber-100 text-amber-800' : 'bg-[#E5DCC3] text-[#5C5648]'
                        }`}>
                            {getInitials(name)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-[16px] font-bold text-gray-900 truncate">{name}</h3>
                            <span className="text-[12px] text-gray-400 font-medium truncate block">{email}</span>
                        </div>
                    </div>

                    {/* Ticket Classification Badge */}
                    <div className="flex-shrink-0">
                        {isMaint ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                🛠️ Maintenance
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                🎫 Client Support
                            </span>
                        )}
                    </div>
                </div>

                {/* Circuit ID Badge if available */}
                {circuitId && (
                    <div className="mb-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-gray-50 text-gray-800 border border-gray-200">
                            <Zap size={11} className="text-amber-500 fill-amber-500" />
                            {circuitId}
                        </span>
                    </div>
                )}

                {/* Ticket ID, Priority, and Creation Date */}
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-block bg-[#F5F2F9] text-[#A688C4] text-[12px] font-bold px-2 py-1 rounded-md">
                        {ticketId ? (ticketId.startsWith('#') ? ticketId : `#${ticketId}`) : ''}
                    </span>

                    {/* Priority badge */}
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

                    <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400 uppercase">
                        <Calendar size={13} className="text-gray-300" />
                        {formatDateIST(date, { day: '2-digit', month: 'short' })}
                    </div>
                </div>

                {/* Subject / Header */}
                <div className="mb-4">
                    <div className="flex items-start gap-2.5">
                        <MessageSquare size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-[13px] text-gray-600 font-medium line-clamp-2 leading-snug">
                            {header}
                        </span>
                    </div>
                </div>

                {/* Day-Wise Activity Status Indicator */}
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-100 mb-3">
                    {needsAction ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
                            <AlertCircle size={12} className="text-rose-500" />
                            Needs Agent Action
                        </span>
                    ) : awaitingResponse ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-violet-700 bg-violet-50 border border-violet-200/80 px-2 py-0.5 rounded-full">
                            <Clock size={12} className="text-violet-500" />
                            Awaiting Response
                        </span>
                    ) : (
                        <span className="text-gray-400 font-medium">Up to date</span>
                    )}

                    {latestActivityDate && (
                        <span className="text-gray-400 text-[11px]">
                            Act: {formatDateIST(latestActivityDate, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-2 mt-1">
                <button
                    onClick={onReply}
                    className="flex-1 py-2.5 border border-gray-900 rounded-xl flex items-center justify-center gap-2 text-[13px] font-bold text-gray-900 hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                    <Mail size={15} strokeWidth={2.5} />
                    View & Reply
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
                        <Trash2 size={15} />
                    </button>
                )}
            </div>
        </div>
    );
};


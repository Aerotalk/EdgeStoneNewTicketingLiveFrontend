import React from 'react';
import { Mail, Calendar, Trash2, Zap, Clock, Wrench, LifeBuoy, FolderSync, Sparkles, CheckCircle2 } from 'lucide-react';
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
    isCarriedForward?: boolean;
    isCreatedToday?: boolean;
    onReply?: () => void;
    onDelete?: () => void;
}

const PriorityBars = ({ priority }: { priority: string }) => {
    const configs: Record<string, { bars: boolean[]; color: string }> = {
        High: { bars: [true, true, true], color: '#EF4444' },
        Medium: { bars: [true, true, false], color: '#D97706' },
        Low: { bars: [true, false, false], color: '#16A34A' },
    };

    const cfg = configs[priority];
    if (!cfg) return null;

    return (
        <div className="flex items-end gap-[2px] h-3.5 flex-shrink-0" title={`Priority: ${priority}`}>
            {cfg.bars.map((active, i) => (
                <div
                    key={i}
                    className="w-[3px] rounded-full transition-all duration-300"
                    style={{
                        backgroundColor: active ? cfg.color : '#E2E8F0',
                        height: i === 0 ? '5px' : i === 1 ? '9px' : '13px',
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
    isCarriedForward,
    isCreatedToday,
    onReply,
    onDelete
}) => {
    // Extract initials from name
    const getInitials = (fullName: string) => {
        const names = (fullName || 'Unknown').trim().split(/\s+/);
        if (names.length >= 2) {
            return (names[0][0] + names[1][0]).toUpperCase();
        }
        return fullName.slice(0, 2).toUpperCase();
    };

    const isMaint = isMaintenance || ticketType === 'Vendor';

    return (
        <div
            onClick={onReply}
            className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group flex flex-col justify-between h-full"
        >
            <div>
                {/* 1. Header Row: Initials, Name, and Classification Badges */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs tracking-wider font-mono flex-shrink-0 border shadow-2xs ${
                                isMaint
                                    ? 'bg-gradient-to-br from-amber-50 to-amber-100/70 text-amber-900 border-amber-200/80'
                                    : 'bg-gradient-to-br from-blue-50 to-indigo-100/70 text-indigo-900 border-indigo-200/80'
                            }`}
                        >
                            {getInitials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[14px] font-bold text-slate-900 truncate leading-snug tracking-tight" title={name}>
                                {name}
                            </h3>
                            <span className="text-[12px] text-slate-500 font-normal truncate block leading-tight mt-0.5" title={email}>
                                {email}
                            </span>
                        </div>
                    </div>

                    {/* Classification Badges */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        {isMaint ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                                <Wrench size={11} className="text-amber-600 flex-shrink-0" />
                                Maintenance
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80">
                                <LifeBuoy size={11} className="text-blue-600 flex-shrink-0" />
                                Client Support
                            </span>
                        )}
                        {isCarriedForward && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80" title="Ticket carried forward from previous days">
                                <FolderSync size={10} className="text-slate-500 flex-shrink-0" />
                                Carry Forward
                            </span>
                        )}
                        {isCreatedToday && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80" title="Ticket created today">
                                <Sparkles size={10} className="text-emerald-600 flex-shrink-0" />
                                New Today
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Technical Metadata Strip: Ticket ID, Circuit ID, Priority, Date */}
                <div className="flex items-center justify-between gap-2 pt-2.5 pb-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11.5px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200/70 flex-shrink-0">
                            {ticketId ? (ticketId.startsWith('#') ? ticketId : `#${ticketId}`) : ''}
                        </span>

                        {circuitId && (
                            <span
                                className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-amber-50/90 text-amber-900 border border-amber-200/80 truncate max-w-[140px] sm:max-w-[160px]"
                                title={`Circuit ID: ${circuitId}`}
                            >
                                <Zap size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                                <span className="truncate">{circuitId}</span>
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {priority && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/70">
                                <PriorityBars priority={priority} />
                                <span
                                    className="text-[11px] font-semibold"
                                    style={{
                                        color:
                                            priority === 'High' ? '#EF4444' :
                                            priority === 'Medium' ? '#D97706' :
                                            '#16A34A',
                                    }}
                                >
                                    {priority}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                            <span>{formatDateIST(date, { day: '2-digit', month: 'short' })}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Subject / Header Message Frame (Uniform Height across all cards) */}
                <div className="my-2.5 py-2.5 px-3 rounded-xl bg-slate-50/70 border border-slate-100/90 flex items-start gap-2 min-h-[48px]">
                    <Mail size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <p
                        className="text-[12.5px] text-slate-700 font-medium line-clamp-2 leading-relaxed break-words"
                        title={header}
                    >
                        {header || 'No Subject'}
                    </p>
                </div>

                {/* 4. Day-Wise Activity Status & Timestamp */}
                <div className="flex items-center justify-between text-[11px] pt-2.5 pb-1 border-t border-slate-100">
                    {needsAction ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50/90 border border-rose-200/80 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
                            Needs Agent Action
                        </span>
                    ) : awaitingResponse ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-violet-700 bg-violet-50/90 border border-violet-200/80 px-2 py-0.5 rounded-full">
                            <Clock size={11} className="text-violet-500 flex-shrink-0" />
                            Awaiting Response
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
                            Up to date
                        </span>
                    )}

                    {latestActivityDate && (
                        <span className="text-slate-400 text-[11px] font-mono">
                            Act: {formatDateIST(latestActivityDate, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>

            {/* 5. Bottom Actions: View & Reply + Delete */}
            <div className="flex items-center gap-2 mt-2 pt-2">
                <button
                    onClick={onReply}
                    className="flex-1 py-2 px-3 border border-slate-900 bg-white hover:bg-slate-900 text-slate-900 hover:text-white rounded-xl flex items-center justify-center gap-2 text-[12.5px] font-semibold active:scale-[0.99] transition-all shadow-2xs group/btn"
                >
                    <Mail size={14} className="transition-transform group-hover/btn:-translate-y-0.5" />
                    View & Reply
                </button>
                {onDelete && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        className="p-2 border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete Ticket"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};




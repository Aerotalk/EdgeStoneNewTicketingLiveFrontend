import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Building2, User, Users } from 'lucide-react';
import { emailSuggestionService, type EmailSuggestion } from '../../services/emailSuggestionService';

interface EmailRecipientAutocompleteProps {
    label: string;
    recipients: string[];
    onAddRecipient: (email: string) => void;
    onRemoveRecipient: (index: number) => void;
    placeholder?: string;
    rightElement?: React.ReactNode;
}

// Avatar color generator based on email hash
const getAvatarColor = (str: string) => {
    const colors = [
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-purple-500 to-violet-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-pink-600',
        'from-cyan-500 to-blue-600'
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string, email: string) => {
    if (name && name !== email && name !== email.split('@')[0]) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
};

export const EmailRecipientAutocomplete: React.FC<EmailRecipientAutocompleteProps> = ({
    label,
    recipients,
    onAddRecipient,
    onRemoveRecipient,
    placeholder = 'Add recipients...',
    rightElement
}) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<EmailSuggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch suggestions with debouncing
    useEffect(() => {
        let isMounted = true;
        const fetchContacts = async () => {
            setIsLoading(true);
            try {
                const results = await emailSuggestionService.getSuggestions(inputValue, 12);
                if (isMounted) {
                    // Filter out emails that are already added
                    const filtered = results.filter(
                        s => !recipients.some(r => r.toLowerCase() === s.email.toLowerCase())
                    );
                    setSuggestions(filtered);
                    setHighlightedIndex(0);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        const timer = setTimeout(fetchContacts, inputValue ? 150 : 0);
        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [inputValue, recipients]);

    // Handle clicks outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isValidEmail = (str: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
    };

    const handleSelectSuggestion = (suggestion: EmailSuggestion) => {
        onAddRecipient(suggestion.email);
        setInputValue('');
        setIsOpen(false);
        inputRef.current?.focus();
    };

    const handleCommitRawInput = () => {
        const email = inputValue.trim().replace(/[,;]$/, '');
        if (isValidEmail(email) && !recipients.includes(email)) {
            onAddRecipient(email);
            setInputValue('');
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen && suggestions.length > 0) {
                setIsOpen(true);
            } else if (suggestions.length > 0) {
                setHighlightedIndex(prev => (prev + 1) % suggestions.length);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (suggestions.length > 0) {
                setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
            }
        } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
            if (isOpen && suggestions.length > 0 && highlightedIndex >= 0 && highlightedIndex < suggestions.length && (e.key === 'Enter' || e.key === 'Tab')) {
                e.preventDefault();
                handleSelectSuggestion(suggestions[highlightedIndex]);
            } else if (inputValue.trim()) {
                e.preventDefault();
                handleCommitRawInput();
            }
        } else if (e.key === 'Backspace' && !inputValue && recipients.length > 0) {
            onRemoveRecipient(recipients.length - 1);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const renderBadge = (item: EmailSuggestion) => {
        if (item.source?.includes('Outlook Recent') || item.category === 'recent') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    <Clock size={10} /> Outlook Recent
                </span>
            );
        }
        if (item.category === 'client') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Building2 size={10} /> Client
                </span>
            );
        }
        if (item.category === 'vendor') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-100">
                    <Users size={10} /> Vendor
                </span>
            );
        }
        if (item.category === 'crew') {
            return (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <User size={10} /> Crew
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold bg-gray-100 text-gray-600">
                Contact
            </span>
        );
    };

    return (
        <div ref={containerRef} className="relative w-full">
            <div
                onClick={() => inputRef.current?.focus()}
                className="flex items-center gap-4 px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl group focus-within:ring-4 focus-within:ring-gray-900/5 focus-within:border-gray-200 transition-all min-h-[52px] cursor-text"
            >
                <span className="text-[13px] font-bold text-gray-400 uppercase tracking-wider w-12 flex-shrink-0 select-none">
                    {label}
                </span>

                <div className="flex-1 flex flex-wrap gap-2 py-1 items-center">
                    {recipients.map((email, i) => (
                        <div
                            key={`${email}-${i}`}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg shadow-sm animate-in zoom-in-95 duration-200"
                        >
                            <span className="text-[13px] font-bold text-gray-900">{email}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveRecipient(i);
                                }}
                                className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded"
                                title="Remove recipient"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}

                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={recipients.length === 0 ? placeholder : ''}
                        value={inputValue}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            // Delay slightly so click on dropdown item takes effect before commit
                            setTimeout(() => {
                                handleCommitRawInput();
                            }, 180);
                        }}
                        className="flex-1 min-w-[130px] bg-transparent border-none focus:ring-0 text-[14px] font-bold text-gray-900 placeholder:text-gray-300 py-1 outline-none"
                    />
                </div>

                {rightElement && (
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {rightElement}
                    </div>
                )}
            </div>

            {/* Outlook-Style Suggestions Dropdown */}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 z-[300] bg-white rounded-2xl shadow-[0_16px_48px_rgba(15,23,42,0.18)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                            {inputValue ? 'Matching Contacts' : 'Outlook Recent & Suggested Contacts'}
                        </span>
                        {isLoading && (
                            <span className="text-[11px] text-gray-400 font-medium animate-pulse">Searching...</span>
                        )}
                    </div>

                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 py-1 scrollbar-thin">
                        {suggestions.map((item, idx) => {
                            const isHighlighted = idx === highlightedIndex;
                            const initials = getInitials(item.name, item.email);
                            const avatarColor = getAvatarColor(item.email);

                            return (
                                <div
                                    key={`${item.email}-${idx}`}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    onClick={() => handleSelectSuggestion(item)}
                                    className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                        isHighlighted ? 'bg-blue-50/70 text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Avatar with gradient */}
                                        <div
                                            className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarColor} text-white flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm`}
                                        >
                                            {initials}
                                        </div>

                                        {/* Name and Email */}
                                        <div className="min-w-0">
                                            <div className="text-[13.5px] font-bold text-gray-900 truncate leading-snug">
                                                {item.name || item.email.split('@')[0]}
                                            </div>
                                            <div className="text-[12px] text-gray-500 truncate leading-snug">
                                                {item.email}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Source Badge */}
                                    <div className="flex-shrink-0 flex items-center gap-1.5">
                                        {renderBadge(item)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

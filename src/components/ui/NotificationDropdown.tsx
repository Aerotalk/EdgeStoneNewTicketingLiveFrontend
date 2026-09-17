import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Ticket, AlertTriangle } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Notification } from '../../services/notificationService';
import { notificationService } from '../../services/notificationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export const NotificationDropdown: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { id: dashboardId } = useParams();

    const fetchNotifications = async () => {
        try {
            const data = await notificationService.getNotifications();
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Listen for new notifications from SSE
        const handleNewNotification = (_event: Event) => {
            fetchNotifications(); // Refresh list to get proper IDs and order
        };

        window.addEventListener('new_notification', handleNewNotification);

        return () => {
            window.removeEventListener('new_notification', handleNewNotification);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            try {
                await notificationService.markAsRead(notification.id);
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
            } catch (err) {
                console.error('Failed to mark read', err);
            }
        }
        if (notification.ticketId) {
            setIsOpen(false);
            const cleanId = notification.ticketId.trim();
            const routeId = dashboardId || 'default';
            const isVendorNotif = notification.type === 'vendor_reply' || (notification.title && notification.title.toLowerCase().includes('vendor')) || (notification.message && notification.message.toLowerCase().includes('vendor'));
            const tabParam = isVendorNotif ? '&tab=vendor' : '';
            navigate(`/dashboard/${routeId}/tickets?ticketId=${encodeURIComponent(cleanId)}${tabParam}`);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-full transition-all duration-300 focus:outline-none active:scale-95 ${
                    isOpen 
                    ? 'bg-red-50 text-brand-red shadow-inner' 
                    : 'bg-white text-gray-500 hover:bg-red-50 hover:text-brand-red shadow-sm hover:shadow-md border border-gray-100'
                }`}
            >
                <Bell size={20} className={`transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] font-extrabold text-white bg-gradient-to-r from-red-500 to-[#d41c34] border-2 border-white rounded-full shadow-md shadow-red-500/30 transform scale-100 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-[420px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100/50 overflow-hidden z-50 transform origin-top-right transition-all duration-300 ring-1 ring-black/5">
                    <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50/90 to-white/90 border-b border-gray-100/50 backdrop-blur-md">
                        <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-2">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-brand-red text-xs font-extrabold">
                                    {unreadCount} New
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-brand-red hover:text-red-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                <Check size={14} strokeWidth={2.5} />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-12 text-center flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                                    <Bell size={28} />
                                </div>
                                <p className="text-sm font-medium text-gray-500">No new notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`relative p-4 border-b border-gray-50 transition-colors cursor-pointer hover:bg-gray-50/80 ${
                                        notification.type === 'closed_ticket_reply' && !notification.isRead
                                            ? 'bg-amber-50/60'
                                            : notification.isRead ? 'bg-white' : 'bg-red-50/30'
                                    }`}
                                >
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {notification.type === 'closed_ticket_reply' ? (
                                                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                                                    <AlertTriangle size={16} />
                                                </div>
                                            ) : notification.type === 'new_ticket' ? (
                                                <div className="w-8 h-8 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center">
                                                    <Ticket size={16} />
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <Bell size={16} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className={`text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
                                                    {notification.title || 'Notification'}
                                                </p>
                                                {notification.type === 'closed_ticket_reply' && (
                                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800">
                                                        Closed Ticket
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {dayjs(notification.createdAt).fromNow()}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <button 
                                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

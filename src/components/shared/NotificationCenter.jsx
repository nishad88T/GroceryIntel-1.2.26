import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Bell, Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const user = await appClient.auth.me();
            if (!user) {
                setLoading(false);
                return;
            }

            const notifs = await appClient.entities.Notification.filter(
                { user_id: user.id },
                '-created_date',
                20
            );

            setNotifications(notifs || []);
            setUnreadCount(notifs?.filter(n => !n.is_read).length || 0);
        } catch (error) {
            console.warn("Could not fetch notifications:", error.message);
            setNotifications([]);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        
        // Refresh notifications every 2 minutes
        const interval = setInterval(fetchNotifications, 120000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (notificationId) => {
        try {
            await appClient.entities.Notification.update(notificationId, { is_read: true });
            setNotifications(prev => 
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            await Promise.all(
                unreadIds.map(id => appClient.entities.Notification.update(id, { is_read: true }))
            );
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    const deleteNotification = async (notificationId, e) => {
        e.stopPropagation();
        try {
            await appClient.entities.Notification.delete(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
            if (wasUnread) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Failed to delete notification:", error);
        }
    };

    const getNotificationIcon = (type) => {
        const icons = {
            trial_started: "🎉",
            trial_ending: "⏰",
            trial_expired: "⚠️",
            first_scan_completed: "🎯",
            first_recipe_parsed: "👨‍🍳",
            household_joined: "🏠",
            limit_reached: "🚫",
            upgraded: "⭐",
            payment_failed: "⚠️",
            renewal_due: "🔔"
        };
        return icons[type] || "📬";
    };

    if (loading) {
        return (
            <Button variant="ghost" size="icon" disabled>
                <Bell className="w-5 h-5 text-slate-400" />
            </Button>
        );
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-600" />
                    {unreadCount > 0 && (
                        <Badge 
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 md:w-96">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={markAllAsRead}
                            className="text-xs text-emerald-600 hover:text-emerald-700"
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                
                <ScrollArea className="h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Bell className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 border-b hover:bg-slate-50 transition-colors ${
                                    !notification.is_read ? 'bg-emerald-50/30' : ''
                                }`}
                            >
                                <div className="flex gap-3">
                                    <div className="text-2xl flex-shrink-0">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-medium text-sm text-slate-900 line-clamp-1">
                                                {notification.title}
                                            </h4>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {!notification.is_read && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => markAsRead(notification.id)}
                                                    >
                                                        <Check className="w-3 h-3 text-emerald-600" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={(e) => deleteNotification(notification.id, e)}
                                                >
                                                    <X className="w-3 h-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        {notification.action_url && (
                                            <Link 
                                                to={createPageUrl(notification.action_url.replace('/', ''))}
                                                onClick={() => {
                                                    markAsRead(notification.id);
                                                    setIsOpen(false);
                                                }}
                                            >
                                                <Button 
                                                    variant="link" 
                                                    className="h-auto p-0 text-xs text-emerald-600 hover:text-emerald-700 mt-2"
                                                >
                                                    Take action <ExternalLink className="w-3 h-3 ml-1" />
                                                </Button>
                                            </Link>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                            {new Date(notification.created_date).toLocaleDateString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
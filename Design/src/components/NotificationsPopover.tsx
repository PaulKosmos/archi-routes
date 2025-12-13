import { useState } from "react";
import { Bell, Check, Trash2, Settings, MessageSquare, Heart, UserPlus, MapPin, Building2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: 'comment' | 'like' | 'follow' | 'route' | 'building';
  title: string;
  message: string;
  time: string;
  read: boolean;
  avatar?: string;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "comment",
    title: "Новый комментарий",
    message: "Анна прокомментировала ваш маршрут «Конструктивизм Москвы»",
    time: "5 мин назад",
    read: false,
  },
  {
    id: "2",
    type: "like",
    title: "Понравилось",
    message: "Михаилу понравился ваш обзор здания Наркомфин",
    time: "1 час назад",
    read: false,
  },
  {
    id: "3",
    type: "follow",
    title: "Новый подписчик",
    message: "Елена подписалась на ваш профиль",
    time: "2 часа назад",
    read: false,
  },
  {
    id: "4",
    type: "route",
    title: "Маршрут одобрен",
    message: "Ваш маршрут «Баухаус в Берлине» прошёл модерацию",
    time: "Вчера",
    read: true,
  },
  {
    id: "5",
    type: "building",
    title: "Новое здание",
    message: "Добавлено новое здание рядом с вашим любимым маршрутом",
    time: "2 дня назад",
    read: true,
  },
];

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'comment':
      return MessageSquare;
    case 'like':
      return Heart;
    case 'follow':
      return UserPlus;
    case 'route':
      return MapPin;
    case 'building':
      return Building2;
    default:
      return Bell;
  }
};

export const NotificationsPopover = () => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-muted relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-96 p-0 bg-card border-2 border-border shadow-lg"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Уведомления</h3>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {unreadCount} новых
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-muted"
              onClick={markAllAsRead}
              title="Прочитать все"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hover:bg-muted"
              title="Настройки"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">Нет уведомлений</p>
              <p className="text-sm">Мы сообщим вам о новых событиях</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer group",
                      !notification.read && "bg-primary/5"
                    )}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      notification.type === 'comment' && "bg-blue-100 text-blue-600",
                      notification.type === 'like' && "bg-red-100 text-red-500",
                      notification.type === 'follow' && "bg-green-100 text-green-600",
                      notification.type === 'route' && "bg-purple-100 text-purple-600",
                      notification.type === 'building' && "bg-amber-100 text-amber-600",
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm",
                          !notification.read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.time}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-3 border-t-2 border-border bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Очистить все
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-sm text-primary hover:text-primary"
            >
              Все уведомления
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

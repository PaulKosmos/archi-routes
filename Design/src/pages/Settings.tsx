import { useState } from "react";
import { Moon, Sun, Bell, Shield, Globe, Eye, Lock, Trash2, Download, Smartphone } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  // Appearance settings
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("ru");
  const [compactMode, setCompactMode] = useState(false);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  const [likeNotifications, setLikeNotifications] = useState(true);
  const [followNotifications, setFollowNotifications] = useState(true);
  const [digestEmail, setDigestEmail] = useState(false);

  // Privacy & Security settings
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [showActivity, setShowActivity] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-display font-bold mb-8">Настройки</h1>
        
        <Tabs defaultValue="appearance" className="w-full max-w-3xl">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Внешний вид</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Приватность</span>
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Тема оформления</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-4 border rounded-[var(--radius)] flex flex-col items-center gap-2 transition-colors ${
                    theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Sun className={`h-6 w-6 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Светлая</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-4 border rounded-[var(--radius)] flex flex-col items-center gap-2 transition-colors ${
                    theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Moon className={`h-6 w-6 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Тёмная</span>
                </button>
                <button
                  onClick={() => setTheme("system")}
                  className={`p-4 border rounded-[var(--radius)] flex flex-col items-center gap-2 transition-colors ${
                    theme === "system" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <Smartphone className={`h-6 w-6 ${theme === "system" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Системная</span>
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Язык</h2>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-full max-w-xs">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode" className="text-base">Компактный режим</Label>
                <p className="text-sm text-muted-foreground">Уменьшает отступы и размеры элементов</p>
              </div>
              <Switch
                id="compact-mode"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Основные уведомления</h2>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">Email-уведомления</Label>
                  <p className="text-sm text-muted-foreground">Получать уведомления на почту</p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base">Push-уведомления</Label>
                  <p className="text-sm text-muted-foreground">Получать уведомления в браузере</p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Типы уведомлений</h2>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comment-notifications" className="text-base">Комментарии</Label>
                  <p className="text-sm text-muted-foreground">Когда кто-то комментирует ваш контент</p>
                </div>
                <Switch
                  id="comment-notifications"
                  checked={commentNotifications}
                  onCheckedChange={setCommentNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="like-notifications" className="text-base">Лайки</Label>
                  <p className="text-sm text-muted-foreground">Когда кто-то ставит лайк</p>
                </div>
                <Switch
                  id="like-notifications"
                  checked={likeNotifications}
                  onCheckedChange={setLikeNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="follow-notifications" className="text-base">Подписки</Label>
                  <p className="text-sm text-muted-foreground">Когда на вас подписываются</p>
                </div>
                <Switch
                  id="follow-notifications"
                  checked={followNotifications}
                  onCheckedChange={setFollowNotifications}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="digest-email" className="text-base">Еженедельный дайджест</Label>
                <p className="text-sm text-muted-foreground">Получать сводку активности раз в неделю</p>
              </div>
              <Switch
                id="digest-email"
                checked={digestEmail}
                onCheckedChange={setDigestEmail}
              />
            </div>
          </TabsContent>

          {/* Privacy & Security Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Видимость профиля</h2>
              
              <Select value={profileVisibility} onValueChange={setProfileVisibility}>
                <SelectTrigger className="w-full max-w-xs">
                  <Eye className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Публичный</SelectItem>
                  <SelectItem value="friends">Только для друзей</SelectItem>
                  <SelectItem value="private">Приватный</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-activity" className="text-base">Показывать активность</Label>
                  <p className="text-sm text-muted-foreground">Другие пользователи видят вашу активность</p>
                </div>
                <Switch
                  id="show-activity"
                  checked={showActivity}
                  onCheckedChange={setShowActivity}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Безопасность</h2>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="two-factor" className="text-base flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Двухфакторная аутентификация
                  </Label>
                  <p className="text-sm text-muted-foreground">Дополнительная защита вашего аккаунта</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={twoFactorAuth}
                  onCheckedChange={setTwoFactorAuth}
                />
              </div>

              <Button variant="outline" className="w-full max-w-xs">
                Изменить пароль
              </Button>
            </div>

            <Separator />

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Управление данными</h2>
              
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="w-full max-w-xs flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Скачать мои данные
                </Button>
                <Button variant="destructive" className="w-full max-w-xs flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Удалить аккаунт
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;

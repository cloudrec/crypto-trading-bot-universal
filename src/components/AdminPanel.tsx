import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Plus, 
  Edit, 
  UserPlus,
  Settings,
  Crown,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AdminPanelProps {
  user: any;
  isAdmin: boolean;
}

interface PricingPlan {
  id: string;
  plan_id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
}

interface UserSubscription {
  id: string;
  user_id: string;
  user_email: string;
  email: string;
  status: string;
  activated_at: string;
  expires_at: string;
  order_number: string;
  is_active: boolean;
  trading_settings?: any;
  api_keys_count: number;
  exchanges: string[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user, isAdmin }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [managingUsers, setManagingUsers] = useState(false);
  
  // Состояния для создания пользователя
  const [newUserEmail, setNewUserEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [customDuration, setCustomDuration] = useState('');
  
  // Состояния для редактирования планов
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editPlanData, setEditPlanData] = useState<Partial<PricingPlan>>({});

  useEffect(() => {
    if (isAdmin) {
      loadPricingPlans();
      loadSubscriptions();
    }
  }, [isAdmin]);

  const loadPricingPlans = async () => {
    try {
      const { data, error } = await supabase
.from('pricing_plans_dev') // DEV таблица
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPricingPlans(data || []);
    } catch (error: any) {
      console.error('Error loading pricing plans:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тарифные планы",
        variant: "destructive",
      });
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
.from('user_subscriptions_dev') // DEV таблица
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error: any) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить подписки",
        variant: "destructive",
      });
    }
  };

  // 👥 ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ДЛЯ УПРАВЛЕНИЯ
  const loadUsersForManagement = async () => {
    try {
      setManagingUsers(true);
      
      const { data, error } = await supabase.functions.invoke('admin_user_management_fixed_2025_11_08_22_40', {
        body: {
          action: 'get_all_users',
          admin_user_id: user.id
        }
      });

      if (error) throw error;

      console.log('👥 USERS LOADED:', data);
      setSubscriptions(data.data.users || []);
      setUserStats(data.data);
      
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить пользователей",
        variant: "destructive",
      });
    } finally {
      setManagingUsers(false);
    }
  };

  // 🔄 АКТИВАЦИЯ/ДЕАКТИВАЦИЯ ПОЛЬЗОВАТЕЛЯ
  const toggleUserActivation = async (userEmail: string, currentStatus: boolean) => {
    try {
      setLoading(true);
      
      const newStatus = !currentStatus;
      
      const { data, error } = await supabase.functions.invoke('admin_user_management_fixed_2025_11_08_22_40', {
        body: {
          action: 'toggle_user_activation',
          admin_user_id: user.id,
          target_user_email: userEmail,
          is_active: newStatus
        }
      });

      if (error) throw error;

      console.log('🔄 USER ACTIVATION TOGGLED:', data);
      
      toast({
        title: "Статус обновлен",
        description: data.data.message,
        variant: "default",
      });
      
      // Перезагружаем список пользователей
      await loadUsersForManagement();
      
    } catch (error: any) {
      console.error('Error toggling user activation:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус пользователя",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createUserWithSubscription = async () => {
    if (!newUserEmail || !selectedPlan) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const selectedPlanData = pricingPlans.find(p => p.plan_id === selectedPlan);
      if (!selectedPlanData) {
        throw new Error('План не найден');
      }

      const duration = customDuration ? parseInt(customDuration) : selectedPlanData.duration_days;

      const { data, error } = await supabase.rpc('create_user_subscription', {
        p_email: newUserEmail,
        p_plan_id: selectedPlan,
        p_duration_days: duration
      });

      if (error) throw error;

      toast({
        title: "Пользователь создан!",
        description: `Пользователь ${newUserEmail} создан с подпиской на ${duration} дней`,
      });

      // Очищаем форму
      setNewUserEmail('');
      setSelectedPlan('');
      setCustomDuration('');
      
      // Перезагружаем подписки
      loadSubscriptions();

    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Ошибка создания пользователя",
        description: error.message || "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePricingPlan = async (planId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
.from('pricing_plans_dev') // DEV таблица
        .update(editPlanData)
        .eq('plan_id', planId);

      if (error) throw error;

      toast({
        title: "План обновлен!",
        description: "Тарифный план успешно обновлен",
      });

      setEditingPlan(null);
      setEditPlanData({});
      loadPricingPlans();

    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast({
        title: "Ошибка обновления",
        description: error.message || "Не удалось обновить план",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          У вас нет прав администратора
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Crown className="h-4 w-4" />
        <AlertDescription>
          🎉 Добро пожаловать в админ-панель, {user?.email}!
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Пользователи
          </TabsTrigger>
          <TabsTrigger value="management">
            <Shield className="h-4 w-4 mr-2" />
            Управление
          </TabsTrigger>
          <TabsTrigger value="plans">
            <DollarSign className="h-4 w-4 mr-2" />
            Тарифы
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Настройки
          </TabsTrigger>
        </TabsList>

        {/* Вкладка пользователей */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Создать пользователя с подпиской
              </CardTitle>
              <CardDescription>
                Создайте нового пользователя и сразу выдайте ему подписку
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userEmail">Email пользователя *</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    placeholder="user@example.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="planSelect">Тарифный план *</Label>
                  <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите план" />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingPlans.map((plan) => (
                        <SelectItem key={plan.plan_id} value={plan.plan_id}>
                          {plan.name} - ${plan.price} ({plan.duration_days} дней)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="customDuration">Кастомная длительность (дни)</Label>
                <Input
                  id="customDuration"
                  type="number"
                  placeholder="Оставьте пустым для стандартной длительности"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              </div>

              <Button 
                onClick={createUserWithSubscription} 
                disabled={loading || !newUserEmail || !selectedPlan}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Создать пользователя
              </Button>
            </CardContent>
          </Card>

          {/* Список подписок */}
          <Card>
            <CardHeader>
              <CardTitle>Активные подписки</CardTitle>
              <CardDescription>
                Последние 20 подписок пользователей
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {subscriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Подписки не найдены
                  </p>
                ) : (
                  subscriptions.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">{sub.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Заказ: {sub.order_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                          {sub.status === 'active' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {sub.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          До: {new Date(sub.expires_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 👥 Вкладка управления пользователями */}
        <TabsContent value="management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Управление пользователями
              </CardTitle>
              <CardDescription>
                Активация и деактивация доступа к торговле
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={loadUsersForManagement}
                  disabled={managingUsers}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {managingUsers ? 'Загрузка...' : 'Загрузить пользователей'}
                </Button>
                
                {userStats && (
                  <div className="flex gap-4 text-sm">
                    <Badge variant="outline" className="bg-green-50">
                      ✅ Активных: {userStats.active_users}
                    </Badge>
                    <Badge variant="outline" className="bg-red-50">
                      ❌ Неактивных: {userStats.inactive_users}
                    </Badge>
                    <Badge variant="outline" className="bg-gray-50">
                      📊 Всего: {userStats.total_users}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Список пользователей */}
              {subscriptions.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Список пользователей:</h3>
                  
                  <div className="space-y-3">
                    {subscriptions.map((subscription: UserSubscription) => {
                      const isExpired = new Date(subscription.expires_at) <= new Date();
                      const isManuallyDeactivated = subscription.is_active === false;
                      const canTrade = !isExpired && !isManuallyDeactivated;
                      
                      return (
                        <div key={subscription.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{subscription.user_email}</span>
                                
                                {/* Статус подписки */}
                                {canTrade ? (
                                  <Badge className="bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    АКТИВНА
                                  </Badge>
                                ) : isManuallyDeactivated ? (
                                  <Badge className="bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    ДЕАКТИВИРОВАН
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    ПОДПИСКА ИСТЕКЛА
                                  </Badge>
                                )}
                                
                                {/* Количество API ключей */}
                                <Badge variant="outline">
                                  🔑 {subscription.api_keys_count || 0} API
                                </Badge>
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                <div>Подписка до: {new Date(subscription.expires_at).toLocaleDateString('ru-RU')}</div>
                                {subscription.trading_settings && (
                                  <div>Биржа: {subscription.trading_settings.exchange} | Пара: {subscription.trading_settings.base_asset}/{subscription.trading_settings.quote_asset}</div>
                                )}
                                {subscription.exchanges && subscription.exchanges.length > 0 && (
                                  <div>Настроенные биржи: {subscription.exchanges.join(', ')}</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Кнопка активации/деактивации */}
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => toggleUserActivation(subscription.user_email, subscription.is_active !== false)}
                                disabled={loading}
                                variant={subscription.is_active === false ? "default" : "destructive"}
                                size="sm"
                              >
                                {subscription.is_active === false ? (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Активировать
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Деактивировать
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Предупреждение о деактивации */}
                          {subscription.is_active === false && (
                            <Alert>
                              <XCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>Пользователь деактивирован администратором.</strong><br/>
                                Пользователь не может пользоваться торговым ботом до активации.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка тарифов */}
        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Управление тарифными планами</CardTitle>
              <CardDescription>
                Редактируйте цены, названия и функции планов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pricingPlans.map((plan) => (
                  <div key={plan.plan_id} className="border rounded p-4">
                    {editingPlan === plan.plan_id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Название</Label>
                            <Input
                              value={editPlanData.name || plan.name}
                              onChange={(e) => setEditPlanData({...editPlanData, name: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label>Цена ($)</Label>
                            <Input
                              type="number"
                              value={editPlanData.price || plan.price}
                              onChange={(e) => setEditPlanData({...editPlanData, price: parseFloat(e.target.value)})}
                            />
                          </div>
                          <div>
                            <Label>Длительность (дни)</Label>
                            <Input
                              type="number"
                              value={editPlanData.duration_days || plan.duration_days}
                              onChange={(e) => setEditPlanData({...editPlanData, duration_days: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => updatePricingPlan(plan.plan_id)} disabled={loading}>
                            Сохранить
                          </Button>
                          <Button variant="outline" onClick={() => setEditingPlan(null)}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${plan.price} за {plan.duration_days} дней
                          </p>
                          <div className="flex gap-1 mt-1">
                            <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                              {plan.is_active ? 'Активен' : 'Неактивен'}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlan(plan.plan_id);
                            setEditPlanData(plan);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Редактировать
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка настроек */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Системные настройки</CardTitle>
              <CardDescription>
                Конфигурация платежной системы и API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>Настройка Plisio API:</strong><br />
                  1. Получите API ключ на https://plisio.net/<br />
                  2. Добавьте PLISIO_API_KEY в Supabase Secrets<br />
                  3. Настройте webhook URL для уведомлений о платежах
                </AlertDescription>
              </Alert>
              
              <div className="p-4 bg-muted rounded">
                <h4 className="font-medium mb-2">Текущие настройки:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Домен: https://fundbot.win</li>
                  <li>• Платежная система: Plisio (криптовалюты)</li>
                  <li>• База данных: Supabase</li>
                  <li>• Админ: {user?.email}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
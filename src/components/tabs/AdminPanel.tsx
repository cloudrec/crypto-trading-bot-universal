import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  CreditCard, 
  Settings, 
  TrendingUp,
  Edit,
  Save,
  X,
  Plus,
  Trash2
} from 'lucide-react';

interface User {
  user_id: string;
  email: string;
  username: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_expires_at: string;
  is_admin: boolean;
  max_exchanges: number;
  max_daily_trades: number;
  created_at: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price_usd: number;
  max_exchanges: number;
  max_daily_trades: number;
  features: string[];
  is_active: boolean;
}

interface Payment {
  id: string;
  user_id: string;
  amount_usd: number;
  status: string;
  plan_name: string;
  created_at: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState({
    name: '',
    price_usd: 0,
    max_exchanges: 1,
    max_daily_trades: 10,
    features: [''],
    is_active: true
  });

  // Статистика
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Загружаем пользователей
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          username,
          subscription_plan,
          subscription_status,
          subscription_expires_at,
          is_admin,
          max_exchanges,
          max_daily_trades,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Users error:', usersError);
      } else {
        // Получаем email из auth.users для каждого пользователя
        const usersWithEmails = await Promise.all(
          (usersData || []).map(async (user) => {
            const { data: authUser } = await supabase.auth.admin.getUserById(user.user_id);
            return {
              ...user,
              email: authUser?.user?.email || 'N/A'
            };
          })
        );
        setUsers(usersWithEmails);
      }

      // Загружаем тарифные планы
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_usd', { ascending: true });

      if (plansError) {
        console.error('Plans error:', plansError);
      } else {
        setSubscriptionPlans(plansData || []);
      }

      // Загружаем платежи
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (paymentsError) {
        console.error('Payments error:', paymentsError);
      } else {
        setPayments(paymentsData || []);
      }

      // Рассчитываем статистику
      const totalUsers = usersData?.length || 0;
      const activeSubscriptions = usersData?.filter(u => u.subscription_status === 'active').length || 0;
      const totalRevenue = paymentsData?.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount_usd, 0) || 0;
      
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const monthlyRevenue = paymentsData?.filter(p => 
        p.status === 'completed' && new Date(p.created_at) >= thisMonth
      ).reduce((sum, p) => sum + p.amount_usd, 0) || 0;

      setStats({
        totalUsers,
        activeSubscriptions,
        totalRevenue,
        monthlyRevenue
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить данные админ панели",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserSubscription = async (userId: string, newPlan: string) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_plan: newPlan,
          subscription_status: 'active',
          subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "✅ Подписка обновлена",
        description: `Пользователю назначен план: ${newPlan}`,
      });

      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleUserAdmin = async (userId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_admin: !isAdmin })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "✅ Права обновлены",
        description: `Админ права ${!isAdmin ? 'выданы' : 'отозваны'}`,
      });

      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Ошибка обновления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const savePlan = async (planId: string, updatedPlan: Partial<SubscriptionPlan>) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update(updatedPlan)
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "✅ План обновлен",
        description: "Тарифный план успешно сохранен",
      });

      setEditingPlan(null);
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Ошибка сохранения",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createNewPlan = async () => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .insert([newPlan]);

      if (error) throw error;

      toast({
        title: "✅ План создан",
        description: "Новый тарифный план добавлен",
      });

      setNewPlan({
        name: '',
        price_usd: 0,
        max_exchanges: 1,
        max_daily_trades: 10,
        features: [''],
        is_active: true
      });

      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Ошибка создания",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот план?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: "✅ План удален",
        description: "Тарифный план удален",
      });

      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-xs text-gray-400">Всего пользователей</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.activeSubscriptions}</p>
                <p className="text-xs text-gray-400">Активных подписок</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-gray-400">Общий доход</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">${stats.monthlyRevenue.toFixed(0)}</p>
                <p className="text-xs text-gray-400">Доход за месяц</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Управление тарифными планами */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            💰 Управление Тарифными Планами
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Создание нового плана */}
          <div className="mb-6 p-4 bg-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">➕ Создать новый план</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label className="text-gray-300">Название</Label>
                <Input
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-gray-600 border-gray-500"
                  placeholder="Премиум"
                />
              </div>
              <div>
                <Label className="text-gray-300">Цена (USD)</Label>
                <Input
                  type="number"
                  value={newPlan.price_usd}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, price_usd: Number(e.target.value) }))}
                  className="bg-gray-600 border-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Макс. бирж</Label>
                <Input
                  type="number"
                  value={newPlan.max_exchanges}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, max_exchanges: Number(e.target.value) }))}
                  className="bg-gray-600 border-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Макс. сделок/день</Label>
                <Input
                  type="number"
                  value={newPlan.max_daily_trades}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, max_daily_trades: Number(e.target.value) }))}
                  className="bg-gray-600 border-gray-500"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={createNewPlan} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Создать
                </Button>
              </div>
            </div>
          </div>

          {/* Список планов */}
          <div className="space-y-4">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className="p-4 bg-gray-700 rounded-lg">
                {editingPlan === plan.id ? (
                  <EditablePlan 
                    plan={plan} 
                    onSave={(updatedPlan) => savePlan(plan.id, updatedPlan)}
                    onCancel={() => setEditingPlan(null)}
                  />
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge className={plan.is_active ? "bg-green-600" : "bg-gray-600"}>
                        {plan.name}
                      </Badge>
                      <span className="text-white font-semibold">${plan.price_usd}/мес</span>
                      <span className="text-gray-400">
                        {plan.max_exchanges} бирж, {plan.max_daily_trades} сделок/день
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setEditingPlan(plan.id)}
                        size="sm"
                        variant="outline"
                        className="border-gray-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => deletePlan(plan.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Управление пользователями */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            👥 Управление Пользователями
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.user_id} className="p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-white font-semibold">{user.email}</p>
                      <p className="text-gray-400 text-sm">
                        {user.username || 'Без имени'} • {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <Badge className={user.subscription_status === 'active' ? "bg-green-600" : "bg-gray-600"}>
                      {user.subscription_plan}
                    </Badge>
                    {user.is_admin && (
                      <Badge className="bg-purple-600">Админ</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Select
                      value={user.subscription_plan}
                      onValueChange={(value) => updateUserSubscription(user.user_id, value)}
                    >
                      <SelectTrigger className="w-40 bg-gray-600 border-gray-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700">
                        {subscriptionPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.name}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      onClick={() => toggleUserAdmin(user.user_id, user.is_admin)}
                      size="sm"
                      variant={user.is_admin ? "destructive" : "default"}
                    >
                      {user.is_admin ? "Убрать админа" : "Сделать админом"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Последние платежи */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            💳 Последние Платежи
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.slice(0, 10).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-semibold">${payment.amount_usd}</p>
                  <p className="text-gray-400 text-sm">
                    {payment.plan_name} • {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <Badge className={payment.status === 'completed' ? "bg-green-600" : payment.status === 'pending' ? "bg-yellow-600" : "bg-red-600"}>
                  {payment.status === 'completed' ? 'Завершен' : payment.status === 'pending' ? 'Ожидает' : 'Отменен'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Компонент для редактирования плана
const EditablePlan = ({ plan, onSave, onCancel }: {
  plan: SubscriptionPlan;
  onSave: (plan: Partial<SubscriptionPlan>) => void;
  onCancel: () => void;
}) => {
  const [editedPlan, setEditedPlan] = useState(plan);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label className="text-gray-300">Название</Label>
          <Input
            value={editedPlan.name}
            onChange={(e) => setEditedPlan(prev => ({ ...prev, name: e.target.value }))}
            className="bg-gray-600 border-gray-500"
          />
        </div>
        <div>
          <Label className="text-gray-300">Цена (USD)</Label>
          <Input
            type="number"
            value={editedPlan.price_usd}
            onChange={(e) => setEditedPlan(prev => ({ ...prev, price_usd: Number(e.target.value) }))}
            className="bg-gray-600 border-gray-500"
          />
        </div>
        <div>
          <Label className="text-gray-300">Макс. бирж</Label>
          <Input
            type="number"
            value={editedPlan.max_exchanges}
            onChange={(e) => setEditedPlan(prev => ({ ...prev, max_exchanges: Number(e.target.value) }))}
            className="bg-gray-600 border-gray-500"
          />
        </div>
        <div>
          <Label className="text-gray-300">Макс. сделок/день</Label>
          <Input
            type="number"
            value={editedPlan.max_daily_trades}
            onChange={(e) => setEditedPlan(prev => ({ ...prev, max_daily_trades: Number(e.target.value) }))}
            className="bg-gray-600 border-gray-500"
          />
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button onClick={() => onSave(editedPlan)} className="bg-green-600 hover:bg-green-700">
          <Save className="h-4 w-4 mr-2" />
          Сохранить
        </Button>
        <Button onClick={onCancel} variant="outline" className="border-gray-600">
          <X className="h-4 w-4 mr-2" />
          Отмена
        </Button>
      </div>
    </div>
  );
};

export default AdminPanel;

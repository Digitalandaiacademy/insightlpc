import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUpRight, ArrowDownRight, Wallet, Loader2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        monthlyGrowth: 0
    });
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [expenseData, setExpenseData] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
    }, [viewMode, selectedDate]);

    const fetchDashboardData = async () => {
        try {
            let startDate: string;
            let endDate: string;

            if (viewMode === 'monthly') {
                startDate = startOfMonth(new Date()).toISOString().split('T')[0];
                endDate = endOfMonth(new Date()).toISOString().split('T')[0];
            } else {
                // Daily mode
                startDate = selectedDate;
                endDate = selectedDate;
            }

            // Fetch all data concurrently
            const [
                transactionsRes,
                purchasesRes,
                revenueEntriesRes,
            ] = await Promise.all([
                supabase.from('transactions').select('*').order('date', { ascending: false }),
                supabase.from('purchases').select('*').order('date', { ascending: false }),
                supabase.from('revenue_entries').select('*').order('date', { ascending: false }),
            ]);

            if (transactionsRes.error) throw transactionsRes.error;
            if (purchasesRes.error) throw purchasesRes.error;
            if (revenueEntriesRes.error) throw revenueEntriesRes.error;

            const transactions = transactionsRes.data || [];
            const purchases = purchasesRes.data || [];
            const revenueEntries = revenueEntriesRes.data || [];

            // Calculate Totals (Current Period)
            let currentRevenue = 0;
            let currentExpenses = 0;

            // Process Transactions
            transactions.forEach(t => {
                if (t.date >= startDate && t.date <= endDate) {
                    if (t.main_category === 'income') currentRevenue += t.amount;
                    else currentExpenses += t.amount;
                }
            });

            // Process Purchases (Expenses)
            purchases.forEach(p => {
                if (p.date >= startDate && p.date <= endDate) {
                    currentExpenses += p.total_price;
                }
            });

            // Process Revenue Entries
            revenueEntries.forEach(r => {
                if (r.date >= startDate && r.date <= endDate) {
                    currentRevenue += r.amount;
                }
            });

            setStats({
                totalRevenue: currentRevenue,
                totalExpenses: currentExpenses,
                netProfit: currentRevenue - currentExpenses,
                monthlyGrowth: 0 // Simplified for now
            });

            // Prepare Recent Activity (Merge and Sort)
            const allActivity = [
                ...transactions.map(t => ({
                    ...t,
                    source: 'transaction',
                    label: `${t.main_category === 'income' ? 'Entrée' : 'Dépense'}: ${t.subcategory}`,
                    type: t.main_category === 'income' ? 'in' : 'out'
                })),
                ...purchases.map(p => ({
                    ...p,
                    source: 'purchase',
                    type: 'out',
                    amount: p.total_price,
                    label: `Achat: ${p.item_name}`
                })),
                ...revenueEntries.map(r => ({
                    ...r,
                    source: 'revenue',
                    type: 'in',
                    label: `Vente ${r.period === 'morning' ? 'Matin' : 'Soir'}: ${r.subcategory}`
                }))
            ].filter(item => item.date >= startDate && item.date <= endDate)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5);

            setRecentTransactions(allActivity);

            // Prepare Chart Data
            if (viewMode === 'monthly') {
                // Weekly Revenue for monthly view (last 7 days)
                const dailyData = new Map();
                [...transactions.filter(t => t.main_category === 'income'), ...revenueEntries].forEach(t => {
                    const date = format(new Date(t.date), 'dd/MM');
                    dailyData.set(date, (dailyData.get(date) || 0) + t.amount);
                });

                const chartData = Array.from(dailyData.entries())
                    .map(([name, value]) => ({ name, value }))
                    .slice(-7);

                setRevenueData(chartData);
            } else {
                // Daily view - breakdown by period (morning/evening)
                const periodData = new Map<string, number>();
                periodData.set('Matin', 0);
                periodData.set('Soir', 0);
                periodData.set('Autres', 0);

                revenueEntries.forEach(r => {
                    if (r.date === selectedDate) {
                        if (r.period === 'morning') {
                            periodData.set('Matin', (periodData.get('Matin') || 0) + r.amount);
                        } else if (r.period === 'evening') {
                            periodData.set('Soir', (periodData.get('Soir') || 0) + r.amount);
                        }
                    }
                });

                transactions.filter(t => t.main_category === 'income' && t.date === selectedDate).forEach(t => {
                    periodData.set('Autres', (periodData.get('Autres') || 0) + t.amount);
                });

                const chartData = Array.from(periodData.entries())
                    .map(([name, value]) => ({ name, value }))
                    .filter(item => item.value > 0);

                setRevenueData(chartData);
            }

            // Prepare Expense Breakdown
            const expenseByCategory = new Map();
            transactions.filter(t => t.main_category === 'expense' && t.date >= startDate && t.date <= endDate).forEach(t => {
                const catName = t.subcategory || 'Autre';
                expenseByCategory.set(catName, (expenseByCategory.get(catName) || 0) + t.amount);
            });
            purchases.filter(p => p.date >= startDate && p.date <= endDate).forEach(p => {
                expenseByCategory.set('Achats Ingrédients', (expenseByCategory.get('Achats Ingrédients') || 0) + p.total_price);
            });

            const pieData = Array.from(expenseByCategory.entries())
                .map(([name, value]) => ({ name, value }));

            setExpenseData(pieData);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* View Mode Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('monthly')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'monthly'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Vue Mensuelle
                    </button>
                    <button
                        onClick={() => setViewMode('daily')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'daily'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        Vue Journalière
                    </button>
                </div>

                {/* Date Selector (visible only in daily mode) */}
                {viewMode === 'daily' && (
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Revenue Card */}
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <ArrowUpRight className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            {viewMode === 'monthly' ? 'Ce mois' : 'Ce jour'}
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Chiffre d'Affaires</h3>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                        {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
                    </p>
                </div>

                {/* Expenses Card */}
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <ArrowDownRight className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">
                            {viewMode === 'monthly' ? 'Ce mois' : 'Ce jour'}
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Dépenses Totales</h3>
                    <p className="text-2xl font-bold text-slate-800 mt-1">
                        {stats.totalExpenses.toLocaleString('fr-FR')} FCFA
                    </p>
                </div>

                {/* Profit Card */}
                <div className="glass-card p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                            Net
                        </span>
                    </div>
                    <h3 className="text-slate-500 text-sm font-medium">Bénéfice Net</h3>
                    <p className={`text-2xl font-bold mt-1 ${stats.netProfit >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                        {stats.netProfit.toLocaleString('fr-FR')} FCFA
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">
                        {viewMode === 'monthly' ? 'Tendance des Revenus' : 'Répartition des Revenus du Jour'}
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={revenueData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expense Breakdown */}
                <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition des Dépenses</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100/50">
                    <h3 className="text-lg font-bold text-slate-800">Activité Récente</h3>
                </div>
                <div className="divide-y divide-slate-100/50">
                    {recentTransactions.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            Aucune activité récente
                        </div>
                    ) : (
                        recentTransactions.map((item, index) => (
                            <div key={index} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${item.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {item.type === 'in' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">{item.label}</p>
                                        <p className="text-xs text-slate-500">{format(new Date(item.date), 'dd MMM yyyy', { locale: fr })}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${item.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.type === 'in' ? '+' : '-'} {item.amount.toLocaleString('fr-FR')} FCFA
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2, Calendar, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

const Reports = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'weekly' | 'monthly' | 'analysis' | 'daily'>('weekly');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [revenueEntries, setRevenueEntries] = useState<any[]>([]);

    // Date filtering
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [selectedDailyDate, setSelectedDailyDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [transRes, purchRes, revRes] = await Promise.all([
                supabase.from('transactions').select('*'),
                supabase.from('purchases').select('*'),
                supabase.from('revenue_entries').select('*')
            ]);

            if (transRes.error) throw transRes.error;
            if (purchRes.error) throw purchRes.error;
            if (revRes.error) throw revRes.error;

            setTransactions(transRes.data || []);
            setPurchases(purchRes.data || []);
            setRevenueEntries(revRes.data || []);
        } catch (error) {
            console.error('Error fetching report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getWeeklyData = () => {
        const start = startOfWeek(selectedMonth, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(selectedMonth, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            let revenue = 0;
            let expenses = 0;

            // Revenue from transactions (main_category 'income')
            transactions.forEach(t => {
                if (isSameDay(new Date(t.date), day) && t.main_category === 'income') revenue += t.amount;
                if (isSameDay(new Date(t.date), day) && t.main_category === 'expense') expenses += t.amount;
            });

            // Revenue from revenue_entries
            revenueEntries.forEach(r => {
                if (isSameDay(new Date(r.date), day)) revenue += r.amount;
            });

            // Expenses from purchases
            purchases.forEach(p => {
                if (isSameDay(new Date(p.date), day)) expenses += p.total_price;
            });

            return {
                name: format(day, 'EEE', { locale: fr }),
                fullDate: format(day, 'dd MMM', { locale: fr }),
                Revenus: revenue,
                Dépenses: expenses,
                Profit: revenue - expenses
            };
        });
    };

    const getMonthlyData = () => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        const days = eachDayOfInterval({ start, end });

        return days.map(day => {
            let revenue = 0;
            let expenses = 0;

            transactions.forEach(t => {
                if (isSameDay(new Date(t.date), day) && t.main_category === 'income') revenue += t.amount;
                if (isSameDay(new Date(t.date), day) && t.main_category === 'expense') expenses += t.amount;
            });

            revenueEntries.forEach(r => {
                if (isSameDay(new Date(r.date), day)) revenue += r.amount;
            });

            purchases.forEach(p => {
                if (isSameDay(new Date(p.date), day)) expenses += p.total_price;
            });

            return {
                name: format(day, 'dd', { locale: fr }),
                Revenus: revenue,
                Dépenses: expenses,
                Profit: revenue - expenses
            };
        });
    };

    const getMarginAnalysis = () => {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        const categoryData = new Map();

        // Group expenses by subcategory
        transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.main_category === 'expense' && tDate >= start && tDate <= end;
        }).forEach(t => {
            const cat = t.subcategory || 'Autre';
            categoryData.set(cat, (categoryData.get(cat) || 0) + t.amount);
        });

        purchases.filter(p => {
            const pDate = new Date(p.date);
            return pDate >= start && pDate <= end;
        }).forEach(p => {
            categoryData.set('Achats Ingrédients', (categoryData.get('Achats Ingrédients') || 0) + p.total_price);
        });

        return Array.from(categoryData.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    };

    const getDailyData = () => {
        const selectedDate = selectedDailyDate;

        let revenue = 0;
        let expenses = 0;
        const dailyTransactions: any[] = [];

        // Collect all transactions for the selected date
        transactions.forEach(t => {
            if (t.date === selectedDate) {
                dailyTransactions.push({
                    ...t,
                    source: 'transaction',
                    label: `${t.main_category === 'income' ? 'Entrée' : 'Dépense'}: ${t.subcategory}`,
                    type: t.main_category === 'income' ? 'in' : 'out'
                });
                if (t.main_category === 'income') revenue += t.amount;
                else expenses += t.amount;
            }
        });

        revenueEntries.forEach(r => {
            if (r.date === selectedDate) {
                dailyTransactions.push({
                    ...r,
                    source: 'revenue',
                    type: 'in',
                    label: `Vente ${r.period === 'morning' ? 'Matin' : 'Soir'}: ${r.subcategory}`
                });
                revenue += r.amount;
            }
        });

        purchases.forEach(p => {
            if (p.date === selectedDate) {
                dailyTransactions.push({
                    ...p,
                    source: 'purchase',
                    type: 'out',
                    amount: p.total_price,
                    label: `Achat: ${p.item_name}`
                });
                expenses += p.total_price;
            }
        });

        // Sort by time if available, otherwise by type
        dailyTransactions.sort((a, b) => {
            if (a.created_at && b.created_at) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return 0;
        });

        // Prepare revenue breakdown by period
        const revenueByPeriod = new Map<string, number>();
        revenueByPeriod.set('Matin', 0);
        revenueByPeriod.set('Soir', 0);
        revenueByPeriod.set('Autres', 0);

        revenueEntries.forEach(r => {
            if (r.date === selectedDate) {
                if (r.period === 'morning') {
                    revenueByPeriod.set('Matin', (revenueByPeriod.get('Matin') || 0) + r.amount);
                } else if (r.period === 'evening') {
                    revenueByPeriod.set('Soir', (revenueByPeriod.get('Soir') || 0) + r.amount);
                }
            }
        });

        transactions.filter(t => t.main_category === 'income' && t.date === selectedDate).forEach(t => {
            revenueByPeriod.set('Autres', (revenueByPeriod.get('Autres') || 0) + t.amount);
        });

        const revenueChartData = Array.from(revenueByPeriod.entries())
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0);

        // Prepare expense breakdown by category
        const expenseByCategory = new Map<string, number>();

        transactions.filter(t => t.main_category === 'expense' && t.date === selectedDate).forEach(t => {
            const catName = t.subcategory || 'Autre';
            expenseByCategory.set(catName, (expenseByCategory.get(catName) || 0) + t.amount);
        });

        purchases.filter(p => p.date === selectedDate).forEach(p => {
            expenseByCategory.set('Achats Ingrédients', (expenseByCategory.get('Achats Ingrédients') || 0) + p.total_price);
        });

        const expenseChartData = Array.from(expenseByCategory.entries())
            .map(([name, value]) => ({ name, value }));

        return {
            revenue,
            expenses,
            profit: revenue - expenses,
            transactions: dailyTransactions,
            revenueChartData,
            expenseChartData
        };
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    // Generate month options (last 12 months)
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const date = subMonths(new Date(), i);
        return {
            value: date.toISOString(),
            label: format(date, 'MMMM yyyy', { locale: fr })
        };
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    const weeklyData = getWeeklyData();
    const monthlyData = getMonthlyData();
    const marginData = getMarginAnalysis();
    const dailyData = getDailyData();

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Rapports Financiers</h1>

                {/* Month Selector */}
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-500" />
                    <select
                        value={selectedMonth.toISOString()}
                        onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                        className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    >
                        {monthOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'weekly'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Synthèse Hebdomadaire
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'monthly'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Synthèse Mensuelle
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'analysis'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Analyse des Marges
                </button>
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`px-4 py-2 font-medium transition-colors ${activeTab === 'daily'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-slate-600 hover:text-slate-800'
                        }`}
                >
                    Vue Journalière
                </button>
            </div>

            {/* Weekly Report */}
            {activeTab === 'weekly' && (
                <div className="glass-card p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">
                        Semaine du {format(startOfWeek(selectedMonth, { weekStartsOn: 1 }), 'dd MMM', { locale: fr })} au {format(endOfWeek(selectedMonth, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: fr })}
                    </h2>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(label, payload) => payload[0]?.payload?.fullDate || label}
                                />
                                <Legend />
                                <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Total Revenus</p>
                            <p className="text-2xl font-bold text-green-700">
                                {weeklyData.reduce((sum, d) => sum + d.Revenus, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-600 font-medium">Total Dépenses</p>
                            <p className="text-2xl font-bold text-red-700">
                                {weeklyData.reduce((sum, d) => sum + d.Dépenses, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="p-4 bg-primary-50 rounded-lg">
                            <p className="text-sm text-primary-600 font-medium">Profit Net</p>
                            <p className="text-2xl font-bold text-primary-700">
                                {weeklyData.reduce((sum, d) => sum + d.Profit, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Report */}
            {activeTab === 'monthly' && (
                <div className="glass-card p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">
                        {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
                    </h2>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="Revenus" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="Profit" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Total Revenus</p>
                            <p className="text-2xl font-bold text-green-700">
                                {monthlyData.reduce((sum, d) => sum + d.Revenus, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-600 font-medium">Total Dépenses</p>
                            <p className="text-2xl font-bold text-red-700">
                                {monthlyData.reduce((sum, d) => sum + d.Dépenses, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="p-4 bg-primary-50 rounded-lg">
                            <p className="text-sm text-primary-600 font-medium">Profit Net</p>
                            <p className="text-2xl font-bold text-primary-700">
                                {monthlyData.reduce((sum, d) => sum + d.Profit, 0).toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Margin Analysis */}
            {activeTab === 'analysis' && (
                <div className="glass-card p-6 rounded-xl">
                    <h2 className="text-lg font-bold text-slate-800 mb-6">
                        Analyse des Dépenses - {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart */}
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={marginData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                        outerRadius={120}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {marginData.map((_, idx) => (
                                            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Table */}
                        <div className="overflow-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200">
                                    <tr>
                                        <th className="text-left py-2 text-sm font-semibold text-slate-700">Catégorie</th>
                                        <th className="text-right py-2 text-sm font-semibold text-slate-700">Montant</th>
                                        <th className="text-right py-2 text-sm font-semibold text-slate-700">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {marginData.map((item, index) => {
                                        const total = marginData.reduce((sum, d) => sum + d.value, 0);
                                        const percentage = (item.value / total) * 100;
                                        return (
                                            <tr key={index}>
                                                <td className="py-3 flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    />
                                                    <span className="text-slate-800">{item.name}</span>
                                                </td>
                                                <td className="py-3 text-right font-semibold text-slate-800">
                                                    {item.value.toLocaleString('fr-FR')} FCFA
                                                </td>
                                                <td className="py-3 text-right text-slate-600">
                                                    {percentage.toFixed(1)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Report */}
            {activeTab === 'daily' && (
                <div className="space-y-6">
                    {/* Date Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <input
                            type="date"
                            value={selectedDailyDate}
                            onChange={(e) => setSelectedDailyDate(e.target.value)}
                            className="px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="glass-card p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium">Revenus du Jour</h3>
                            <p className="text-2xl font-bold text-green-700 mt-1">
                                {dailyData.revenue.toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="glass-card p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                    <ArrowDownRight className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium">Dépenses du Jour</h3>
                            <p className="text-2xl font-bold text-red-700 mt-1">
                                {dailyData.expenses.toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                        <div className="glass-card p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                            </div>
                            <h3 className="text-slate-500 text-sm font-medium">Profit Net</h3>
                            <p className={`text-2xl font-bold mt-1 ${dailyData.profit >= 0 ? 'text-primary-700' : 'text-red-700'}`}>
                                {dailyData.profit.toLocaleString('fr-FR')} FCFA
                            </p>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Revenue Breakdown */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition des Revenus</h3>
                            <div className="h-64">
                                {dailyData.revenueChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dailyData.revenueChartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        Aucun revenu pour cette date
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="glass-card p-6 rounded-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Répartition des Dépenses</h3>
                            <div className="h-64">
                                {dailyData.expenseChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dailyData.expenseChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {dailyData.expenseChartData.map((_, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-500">
                                        Aucune dépense pour cette date
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Transactions Table */}
                    <div className="glass-card rounded-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100/50">
                            <h3 className="text-lg font-bold text-slate-800">
                                Transactions du {format(new Date(selectedDailyDate), 'dd MMMM yyyy', { locale: fr })}
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            {dailyData.transactions.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    Aucune transaction pour cette date
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Description</th>
                                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Montant</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {dailyData.transactions.map((item, index) => (
                                            <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${item.type === 'in'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {item.type === 'in' ? (
                                                            <ArrowUpRight className="w-3 h-3" />
                                                        ) : (
                                                            <ArrowDownRight className="w-3 h-3" />
                                                        )}
                                                        <span className="text-xs font-medium">
                                                            {item.type === 'in' ? 'Revenu' : 'Dépense'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-slate-800">{item.label}</td>
                                                <td className={`py-3 px-4 text-right font-semibold ${item.type === 'in' ? 'text-green-700' : 'text-red-700'
                                                    }`}>
                                                    {item.type === 'in' ? '+' : '-'} {item.amount.toLocaleString('fr-FR')} FCFA
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;

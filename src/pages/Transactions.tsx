import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader2, Save, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useTransactionSubcategories } from '../hooks/useSubcategoryAutocomplete';

interface Transaction {
    id: string;
    date: string;
    main_category: 'expense' | 'income';
    subcategory: string;
    description: string;
    amount: number;
}

const Transactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [mainCategory, setMainCategory] = useState<'expense' | 'income'>('expense');
    const [subcategory, setSubcategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    // Autocomplete
    const { filterSubcategories } = useTransactionSubcategories(mainCategory);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

    useEffect(() => {
        fetchTransactions();
    }, []);

    useEffect(() => {
        // Update suggestions whenever autocomplete is shown
        if (showAutocomplete) {
            setFilteredSuggestions(filterSubcategories(subcategory));
        } else {
            setFilteredSuggestions([]);
        }
    }, [subcategory, showAutocomplete, mainCategory]);

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTransactions(data || []);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !subcategory) return;

        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert([{
                    date,
                    main_category: mainCategory,
                    subcategory: subcategory.trim(),
                    description: description.trim(),
                    amount: parseFloat(amount)
                }])
                .select()
                .single();

            if (error) throw error;

            setTransactions([data, ...transactions]);
            setIsAdding(false);
            // Reset form but keep date and main category
            setSubcategory('');
            setDescription('');
            setAmount('');
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Erreur lors de l\'ajout de la transaction.');
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;

        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setTransactions(transactions.filter(t => t.id !== id));
        } catch (error) {
            console.error('Error deleting transaction:', error);
        }
    };

    const selectSuggestion = (suggestion: string) => {
        setSubcategory(suggestion);
        setShowAutocomplete(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Transactions Quotidiennes</h1>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle Transaction
                </button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-800">Ajouter une transaction</h3>
                        <button
                            onClick={() => setIsAdding(false)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <form onSubmit={handleAddTransaction} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMainCategory('expense')}
                                        className={clsx(
                                            'flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2',
                                            mainCategory === 'expense'
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        )}
                                    >
                                        <ArrowDownCircle className="w-4 h-4" />
                                        Dépenses
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMainCategory('income')}
                                        className={clsx(
                                            'flex-1 px-4 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2',
                                            mainCategory === 'income'
                                                ? 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        )}
                                    >
                                        <ArrowUpCircle className="w-4 h-4" />
                                        Entrées
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <label className="block text-sm text-slate-600 mb-1">
                                Sous-catégorie <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={subcategory}
                                onChange={(e) => setSubcategory(e.target.value)}
                                onFocus={() => setShowAutocomplete(true)}
                                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder={mainCategory === 'expense' ? 'Ex: Transport, Loyer, Électricité...' : 'Ex: Pourboire, Don, Caisse...'}
                                required
                            />
                            {filteredSuggestions.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                    {filteredSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => selectSuggestion(suggestion)}
                                            className="w-full px-3 py-2 text-left hover:bg-primary-50 text-slate-800"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Montant (FCFA) <span className="text-red-500">*</span></label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="0"
                                min="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm text-slate-600 mb-1">Description (optionnel)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                placeholder="Détails supplémentaires..."
                                rows={2}
                            />
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Type</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Sous-catégorie</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Montant</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Aucune transaction enregistrée pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {format(new Date(transaction.date), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                                transaction.main_category === 'expense'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                            )}>
                                                {transaction.main_category === 'expense' ? (
                                                    <>
                                                        <ArrowDownCircle className="w-3 h-3" />
                                                        Dépenses
                                                    </>
                                                ) : (
                                                    <>
                                                        <ArrowUpCircle className="w-3 h-3" />
                                                        Entrées
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {transaction.subcategory}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {transaction.description || '-'}
                                        </td>
                                        <td className={clsx(
                                            'px-6 py-4 text-right font-bold',
                                            transaction.main_category === 'expense' ? 'text-red-600' : 'text-green-600'
                                        )}>
                                            {transaction.main_category === 'expense' ? '- ' : '+ '}
                                            {transaction.amount.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteTransaction(transaction.id)}
                                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader2, Save, X, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRevenueSubcategories } from '../hooks/useSubcategoryAutocomplete';

interface RevenueEntry {
    id: string;
    date: string;
    subcategory: string;
    amount: number;
    description: string;
    period: 'morning' | 'evening';
}

interface RevenueLine {
    id: string;
    subcategory: string;
    amount: string;
    description: string;
}

const RevenueMorning = () => {
    const [entries, setEntries] = useState<RevenueEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Multi-line state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lines, setLines] = useState<RevenueLine[]>([]);

    // Autocomplete
    const { filterSubcategories } = useRevenueSubcategories('morning');
    const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = async () => {
        try {
            const { data, error } = await supabase
                .from('revenue_entries')
                .select('*')
                .eq('period', 'morning')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching revenue entries:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNewLine = () => {
        setLines([...lines, {
            id: crypto.randomUUID(),
            subcategory: '',
            amount: '',
            description: ''
        }]);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: keyof RevenueLine, value: string) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const selectSuggestion = (lineId: string, suggestion: string) => {
        setLines(lines.map(l => l.id === lineId ? { ...l, subcategory: suggestion } : l));
        setActiveAutocomplete(null);
        setAutocompleteQuery('');
    };

    const calculateGlobalTotal = () => {
        return lines.reduce((sum, line) => sum + (parseFloat(line.amount) || 0), 0);
    };

    const handleSubmitAll = async () => {
        if (lines.length === 0) return;

        // Validate all lines
        const validLines = lines.filter(l => l.subcategory && l.amount);
        if (validLines.length === 0) {
            alert('Veuillez remplir au moins une ligne complète.');
            return;
        }

        setSubmitting(true);

        try {
            const entriesToInsert = validLines.map(line => ({
                date,
                subcategory: line.subcategory.trim(),
                amount: parseFloat(line.amount),
                description: line.description.trim(),
                period: 'morning' as const
            }));

            const { data, error } = await supabase
                .from('revenue_entries')
                .insert(entriesToInsert)
                .select();

            if (error) throw error;

            setEntries([...data, ...entries]);
            setIsAdding(false);
            setLines([]);
        } catch (error) {
            console.error('Error adding revenue entries:', error);
            alert('Erreur lors de l\'enregistrement des ventes.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette entrée ?')) return;

        try {
            const { error } = await supabase
                .from('revenue_entries')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setEntries(entries.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting revenue entry:', error);
        }
    };

    const startAdding = () => {
        setIsAdding(true);
        setLines([{
            id: crypto.randomUUID(),
            subcategory: '',
            amount: '',
            description: ''
        }]);
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
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <Sun className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Ventes Matin (Petit-déjeuner)</h1>
                </div>
                <button
                    onClick={startAdding}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nouvelle Entrée
                </button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-800">Ajouter des ventes</h3>
                        <button
                            onClick={() => { setIsAdding(false); setLines([]); }}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-500" />
                        </button>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-slate-600 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Article</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Montant (FCFA)</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Description</th>
                                    <th className="pb-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line) => {
                                    const filteredSuggestions = activeAutocomplete === line.id
                                        ? filterSubcategories(autocompleteQuery)
                                        : [];

                                    return (
                                        <tr key={line.id} className="border-b border-slate-100">
                                            <td className="py-3 pr-2 relative">
                                                <input
                                                    type="text"
                                                    value={line.subcategory}
                                                    onChange={(e) => {
                                                        updateLine(line.id, 'subcategory', e.target.value);
                                                        setActiveAutocomplete(line.id);
                                                        setAutocompleteQuery(e.target.value);
                                                    }}
                                                    onFocus={() => {
                                                        setActiveAutocomplete(line.id);
                                                        setAutocompleteQuery(line.subcategory);
                                                    }}
                                                    onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Ex: Oeufs simple, Café, Lait..."
                                                />
                                                {filteredSuggestions.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredSuggestions.map((suggestion, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => selectSuggestion(line.id, suggestion)}
                                                                className="w-full px-3 py-2 text-left hover:bg-primary-50 text-slate-800"
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 pr-2">
                                                <input
                                                    type="number"
                                                    value={line.amount}
                                                    onChange={(e) => updateLine(line.id, 'amount', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="py-3 pr-2">
                                                <input
                                                    type="text"
                                                    value={line.description}
                                                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Détails..."
                                                />
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => removeLine(line.id)}
                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    disabled={lines.length === 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                        <button
                            onClick={addNewLine}
                            className="text-primary-600 hover:text-primary-700 font-medium flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Ajouter une ligne
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-slate-500">Total estimé</p>
                                <p className="text-2xl font-bold text-green-600">
                                    + {calculateGlobalTotal().toLocaleString('fr-FR')} FCFA
                                </p>
                            </div>
                            <button
                                onClick={handleSubmitAll}
                                disabled={submitting || lines.length === 0}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enregistrement...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Enregistrer tout
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Article</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Montant</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Aucune vente enregistrée pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {format(new Date(entry.date), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {entry.subcategory}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {entry.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">
                                            + {entry.amount.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteEntry(entry.id)}
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

export default RevenueMorning;

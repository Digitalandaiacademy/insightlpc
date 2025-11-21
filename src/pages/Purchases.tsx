import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Loader2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePurchaseAutocomplete } from '../hooks/usePurchaseAutocomplete';

interface Purchase {
    id: string;
    date: string;
    item_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

interface PurchaseLine {
    id: string;
    item_name: string;
    quantity: string;
    unit: string;
    unit_price: string;
}

const Purchases = () => {
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Multi-line state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [lines, setLines] = useState<PurchaseLine[]>([]);

    // Autocomplete
    const { suggestions, filterSuggestions } = usePurchaseAutocomplete();
    const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
    const [autocompleteQuery, setAutocompleteQuery] = useState('');

    useEffect(() => {
        fetchPurchases();
    }, []);

    const fetchPurchases = async () => {
        try {
            const { data, error } = await supabase
                .from('purchases')
                .select('*')
                .order('date', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPurchases(data || []);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        } finally {
            setLoading(false);
        }
    };

    const addNewLine = () => {
        setLines([...lines, {
            id: crypto.randomUUID(),
            item_name: '',
            quantity: '',
            unit: 'kg',
            unit_price: ''
        }]);
    };

    const removeLine = (id: string) => {
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id: string, field: keyof PurchaseLine, value: string) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const selectSuggestion = (lineId: string, suggestion: { item_name: string; unit_price: number; unit: string }) => {
        setLines(lines.map(l => l.id === lineId ? {
            ...l,
            item_name: suggestion.item_name,
            unit_price: suggestion.unit_price.toString(),
            unit: suggestion.unit
        } : l));
        setActiveAutocomplete(null);
        setAutocompleteQuery('');
    };

    const calculateLineTotal = (line: PurchaseLine) => {
        const qty = parseFloat(line.quantity) || 0;
        const price = parseFloat(line.unit_price) || 0;
        return qty * price;
    };

    const calculateGlobalTotal = () => {
        return lines.reduce((sum, line) => sum + calculateLineTotal(line), 0);
    };

    const handleSubmitAll = async () => {
        if (lines.length === 0) return;

        // Validate all lines
        const validLines = lines.filter(l => l.item_name && l.quantity && l.unit_price);
        if (validLines.length === 0) {
            alert('Veuillez remplir au moins une ligne complète.');
            return;
        }

        setSubmitting(true);

        try {
            const purchasesToInsert = validLines.map(line => ({
                date,
                item_name: line.item_name,
                quantity: parseFloat(line.quantity),
                unit: line.unit,
                unit_price: parseFloat(line.unit_price),
                total_price: calculateLineTotal(line)
            }));

            const { data, error } = await supabase
                .from('purchases')
                .insert(purchasesToInsert)
                .select();

            if (error) throw error;

            setPurchases([...data, ...purchases]);
            setIsAdding(false);
            setLines([]);
        } catch (error) {
            console.error('Error adding purchases:', error);
            alert('Erreur lors de l\'enregistrement des achats.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePurchase = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) return;

        try {
            const { error } = await supabase
                .from('purchases')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setPurchases(purchases.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error deleting purchase:', error);
        }
    };

    const startAdding = () => {
        setIsAdding(true);
        setLines([{
            id: crypto.randomUUID(),
            item_name: '',
            quantity: '',
            unit: 'kg',
            unit_price: ''
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
                <h1 className="text-2xl font-bold text-slate-800">Achats Détaillés</h1>
                <button
                    onClick={startAdding}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Nouvel Achat
                </button>
            </div>

            {isAdding && (
                <div className="glass-card p-6 rounded-xl mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-slate-800">Enregistrer des achats</h3>
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
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="border-b border-slate-200">
                                <tr>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Article</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Quantité</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Unité</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700">Prix Unit.</th>
                                    <th className="pb-2 pr-2 text-sm font-semibold text-slate-700 text-right">Total</th>
                                    <th className="pb-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lines.map((line, index) => {
                                    const filteredSuggestions = activeAutocomplete === line.id
                                        ? filterSuggestions(autocompleteQuery)
                                        : [];

                                    return (
                                        <tr key={line.id} className="border-b border-slate-100">
                                            <td className="py-3 pr-2 relative">
                                                <input
                                                    type="text"
                                                    value={line.item_name}
                                                    onChange={(e) => {
                                                        updateLine(line.id, 'item_name', e.target.value);
                                                        setActiveAutocomplete(line.id);
                                                        setAutocompleteQuery(e.target.value);
                                                    }}
                                                    onFocus={() => {
                                                        setActiveAutocomplete(line.id);
                                                        setAutocompleteQuery(line.item_name);
                                                    }}
                                                    onBlur={() => setTimeout(() => setActiveAutocomplete(null), 200)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="Ex: Farine"
                                                />
                                                {filteredSuggestions.length > 0 && (
                                                    <div className="absolute z-10 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredSuggestions.map((suggestion, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() => selectSuggestion(line.id, suggestion)}
                                                                className="w-full px-3 py-2 text-left hover:bg-primary-50 flex justify-between items-center"
                                                            >
                                                                <span className="font-medium text-slate-800">{suggestion.item_name}</span>
                                                                <span className="text-sm text-slate-500">{suggestion.unit_price} FCFA/{suggestion.unit}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 pr-2">
                                                <input
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(line.id, 'quantity', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="0"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="py-3 pr-2">
                                                <select
                                                    value={line.unit}
                                                    onChange={(e) => updateLine(line.id, 'unit', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                >
                                                    <option value="kg">kg</option>
                                                    <option value="g">g</option>
                                                    <option value="l">l</option>
                                                    <option value="ml">ml</option>
                                                    <option value="pcs">pcs</option>
                                                    <option value="sac">sac</option>
                                                    <option value="carton">carton</option>
                                                </select>
                                            </td>
                                            <td className="py-3 pr-2">
                                                <input
                                                    type="number"
                                                    value={line.unit_price}
                                                    onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </td>
                                            <td className="py-3 pr-2 text-right font-semibold text-primary-700">
                                                {calculateLineTotal(line).toLocaleString('fr-FR')} FCFA
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
                                <p className="text-2xl font-bold text-primary-700">
                                    {calculateGlobalTotal().toLocaleString('fr-FR')} FCFA
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
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Quantité</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Prix Unitaire</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {purchases.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        Aucun achat enregistré pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                purchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                            {format(new Date(purchase.date), 'dd MMM yyyy', { locale: fr })}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-800">
                                            {purchase.item_name}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {purchase.quantity} {purchase.unit}
                                        </td>
                                        <td className="px-6 py-4 text-right text-slate-600">
                                            {purchase.unit_price.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-primary-700">
                                            {purchase.total_price.toLocaleString('fr-FR')} FCFA
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeletePurchase(purchase.id)}
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

export default Purchases;

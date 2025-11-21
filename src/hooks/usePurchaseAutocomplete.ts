import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface PurchaseSuggestion {
    item_name: string;
    unit_price: number;
    unit: string;
}

export const usePurchaseAutocomplete = () => {
    const [suggestions, setSuggestions] = useState<PurchaseSuggestion[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const fetchSuggestions = async () => {
        setLoading(true);
        try {
            // Get unique items with their most recent unit price
            const { data, error } = await supabase
                .from('purchases')
                .select('item_name, unit_price, unit, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group by item_name and keep only the most recent entry
            const uniqueItems = new Map<string, PurchaseSuggestion>();
            data?.forEach((item) => {
                if (!uniqueItems.has(item.item_name)) {
                    uniqueItems.set(item.item_name, {
                        item_name: item.item_name,
                        unit_price: item.unit_price,
                        unit: item.unit
                    });
                }
            });

            setSuggestions(Array.from(uniqueItems.values()));
        } catch (error) {
            console.error('Error fetching purchase suggestions:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSuggestions = (query: string) => {
        // If no query, return all suggestions
        if (!query || query.trim() === '') return suggestions;

        return suggestions.filter(s =>
            s.item_name.toLowerCase().includes(query.toLowerCase())
        );
    };

    return { suggestions, loading, filterSuggestions };
};

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useTransactionSubcategories = (mainCategory: 'expense' | 'income') => {
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSubcategories();
    }, [mainCategory]);

    const fetchSubcategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('subcategory')
                .eq('main_category', mainCategory)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get unique subcategories (remove duplicates)
            const unique = [...new Set(data?.map(item => item.subcategory).filter(Boolean) || [])];
            setSubcategories(unique);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSubcategories = (query: string) => {
        // If no query, return all subcategories
        if (!query || query.trim() === '') return subcategories;

        // Filter based on query
        return subcategories.filter(s =>
            s.toLowerCase().includes(query.toLowerCase())
        );
    };

    return { subcategories, loading, filterSubcategories };
};

export const useRevenueSubcategories = (period: 'morning' | 'evening') => {
    const [subcategories, setSubcategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSubcategories();
    }, [period]);

    const fetchSubcategories = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('revenue_entries')
                .select('subcategory')
                .eq('period', period)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Get unique subcategories (remove duplicates)
            const unique = [...new Set(data?.map(item => item.subcategory).filter(Boolean) || [])];
            setSubcategories(unique);
        } catch (error) {
            console.error('Error fetching subcategories:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterSubcategories = (query: string) => {
        // If no query, return all subcategories
        if (!query || query.trim() === '') return subcategories;

        // Filter based on query
        return subcategories.filter(s =>
            s.toLowerCase().includes(query.toLowerCase())
        );
    };

    return { subcategories, loading, filterSubcategories };
};

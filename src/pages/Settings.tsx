import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>

            {/* User Info */}
            <div className="glass-card p-6 rounded-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-primary-100 rounded-full text-primary-600">
                        <User className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Informations du compte</h2>
                        <p className="text-sm text-slate-500">Gérez vos paramètres de compte</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                        <p className="text-slate-800">{user?.email}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Se déconnecter
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="glass-card p-6 rounded-xl">
                <h3 className="font-semibold text-slate-800 mb-2">À propos du système</h3>
                <p className="text-sm text-slate-600">
                    Plateforme de gestion financière pour La Petite Crêpière.
                    Les catégories et sous-catégories sont créées automatiquement lors de la saisie des données.
                </p>
            </div>
        </div>
    );
};

export default Settings;

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Save, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Password form state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' });
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Une erreur est survenue.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
                    <User className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">Mon Profil</h1>
            </div>

            {/* User Info Card */}
            <div className="glass-card p-6 rounded-xl mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Informations du compte</h2>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm text-slate-600 mb-1">Email</label>
                        <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-700 border border-slate-200">
                            {user?.email}
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Update Card */}
            <div className="glass-card p-6 rounded-xl">
                <div className="flex items-center gap-2 mb-4">
                    <Lock className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Changer le mot de passe</h2>
                </div>

                {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${message.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="text-sm">{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-600 mb-1">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                        <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
                    </div>

                    <div>
                        <label className="block text-sm text-slate-600 mb-1">Confirmer le mot de passe</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Mise à jour...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Mettre à jour le mot de passe
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Profile;

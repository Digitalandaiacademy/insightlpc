import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, ShoppingCart, Settings, LogOut, Sun, Moon, PieChart, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { signOut } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Tableau de bord', path: '/' },
        { icon: Receipt, label: 'Transactions', path: '/transactions' },
        { icon: ShoppingCart, label: 'Achats', path: '/purchases' },
        { icon: Sun, label: 'CA Matin', path: '/revenue-morning' },
        { icon: Moon, label: 'CA Soir', path: '/revenue-evening' },
        { icon: PieChart, label: 'Rapports', path: '/reports' },
        { icon: User, label: 'Profil', path: '/profile' },
        { icon: Settings, label: 'Paramètres', path: '/settings' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 h-screen glass border-r border-white/40 
                flex flex-col shrink-0 
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Close button for mobile */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/20 md:hidden"
                >
                    <X className="w-5 h-5 text-slate-600" />
                </button>

                <div className="p-6 border-b border-white/20">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
                        Insight LPC
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">La Petite Crêpière</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => onClose()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                    : 'text-slate-600 hover:bg-white/50 hover:text-primary-600'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/20">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">Déconnexion</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;

import { useContext } from 'react';
import { Home, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-md">
      <div className="flex items-center space-x-2 text-primary">
        <Home size={28} className="text-secondary" />
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary hidden sm:block">
          SmartHome
        </h1>
      </div>
      <div className="flex items-center space-x-6">
        <span className="text-sm text-slate-300 font-medium">Hello, <span className="text-white">{user.name}</span></span>
        <button 
          onClick={logout}
          className="flex items-center space-x-1 text-slate-400 hover:text-danger focus:outline-none transition-colors duration-200"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

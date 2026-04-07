import { Bell, Menu, Search } from 'lucide-react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Topbar = ({ setOpen }) => {
  const { user } = useContext(AuthContext);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between glass px-6 py-4 lg:hidden">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-white sm:hidden">SmartHome</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        <button className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 border-2 border-zinc-950"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 border border-zinc-700 flex items-center justify-center text-zinc-950 font-bold text-sm">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

import { Link, useLocation } from 'react-router-dom';

const navButtonClass =
  'rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-200/60 hover:scale-[1.03]';

const Navbar = () => {
  const location = useLocation();

  return (
    <header className="fixed inset-x-0 top-0 z-50" data-public-navbar>
      <nav className="mx-auto mt-4 flex w-[min(96%,1100px)] items-center justify-between rounded-2xl border border-white/15 bg-black/30 px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
        <Link
          to="/"
          className="text-lg font-bold tracking-tight text-white sm:text-xl"
        >
          Smart Home
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/auth/choose"
            className={`${navButtonClass} border border-white/20 text-white hover:border-amber-200/50 hover:bg-white/10 hover:shadow-[0_0_25px_rgba(251,191,36,0.22)]`}
            aria-current={location.pathname === '/auth/choose' ? 'page' : undefined}
          >
            Choose Role
          </Link>
          <Link
            to="/auth/resident/register"
            className={`${navButtonClass} bg-amber-300 text-zinc-900 hover:bg-amber-200 hover:shadow-[0_0_25px_rgba(251,191,36,0.28)]`}
            aria-current={location.pathname === '/auth/resident/register' ? 'page' : undefined}
          >
            Resident Sign Up
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

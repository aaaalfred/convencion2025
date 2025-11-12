import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, Trophy, User } from 'lucide-react';
import herdezLogo from '@/assets/herdez-logo.webp';
import { SessionManager } from '@/lib/session';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = false, title }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    setIsAuthenticated(SessionManager.isActive());

    // Scroll handler
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`shadow-lg sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#da241a]/80 backdrop-blur-md'
          : 'bg-[#da241a]'
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img
              src={herdezLogo}
              alt="Herdez Concursos"
              className="h-16 md:h-20 w-auto object-contain hover:opacity-90 transition-opacity"
            />
          </Link>

          {title && (
            <h1 className="text-white text-lg md:text-xl font-semibold">{title}</h1>
          )}

          {/* Navigation Options */}
          {!title && !showBackButton && (
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-white hover:text-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Inicio
              </Link>
              <Link
                to="/ranking"
                className="text-white hover:text-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Ranking
              </Link>
              {isAuthenticated && (
                <Link
                  to="/mi-perfil"
                  className="text-white hover:text-gray-200 transition-colors font-medium flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>
              )}
            </nav>
          )}

          {showBackButton && (
            <Link
              to="/"
              className="text-white hover:text-gray-200 transition-colors font-medium"
            >
              ← Volver
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

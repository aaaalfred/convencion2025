import { Link } from 'react-router-dom';
import herdezLogo from '@/assets/herdez-logo.webp';

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
}

export function Header({ showBackButton = false, title }: HeaderProps) {
  return (
    <header className="bg-[#da241a] shadow-lg sticky top-0 z-40">
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

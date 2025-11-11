import { Link } from 'react-router-dom';
import herdezLogo from '@/assets/herdez-logo.webp';

export function Footer() {
  return (
    <footer className="bg-accent text-accent-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/">
              <img
                src={herdezLogo}
                alt="Herdez Concursos"
                className="h-16 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <span className="hover:text-primary transition-colors cursor-pointer">
              © Concursos Herdez {new Date().getFullYear()}
            </span>
            <a href="#" className="hover:text-primary transition-colors">
              Contacto
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Términos y Condiciones
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

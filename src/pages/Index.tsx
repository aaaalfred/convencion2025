import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, UserPlus, Trophy, User } from 'lucide-react';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { SessionManager } from '@/lib/session';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(SessionManager.isActive());
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-orange-500 py-16 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
               Convención Nacional SAHUAYO 2025
            </h1>
            <p className="text-xl md:text-2xl text-white/95 mb-2">
              Sistema de Validación Facial
            </p>
            <p className="text-base md:text-lg text-white/80">
              Escanea QR, valida tu rostro y acumula puntos
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-12">

        {/* Cards de navegación */}
        <div className={`grid md:grid-cols-2 gap-6 max-w-6xl mx-auto ${isAuthenticated ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>

          {/* Registro - Solo mostrar si NO está autenticado */}
          {!isAuthenticated && (
            <Link to="/registro">
              <Card className="hover:shadow-card-hover transition-all duration-300 hover:scale-105 cursor-pointer h-full bg-card shadow-card">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>Registrarme</CardTitle>
                  <CardDescription>
                    Primera vez? Regístrate con tu selfie
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full bg-green-500 hover:bg-green-600">
                    Comenzar
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Concurso Demo */}
          <Link to="/concurso/NAV2024">
            <Card className="hover:shadow-card-hover transition-all duration-300 hover:scale-105 cursor-pointer h-full bg-card shadow-card">
              <CardHeader>
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Gana tus primeros 100 pts.</CardTitle>
                <CardDescription>
                  📸 Tómate una selfie para validar tu identidad; te reconocemos automático y gana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-primary hover:bg-primary/90">
                  Participar (100 pts)
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Mi Perfil */}
          <Link to="/mi-perfil">
            <Card className="hover:shadow-card-hover transition-all duration-300 hover:scale-105 cursor-pointer h-full bg-card shadow-card">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Mi Perfil</CardTitle>
                <CardDescription>
                  Consulta tus puntos e historial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-accent hover:bg-accent/90">
                  Ver Perfil
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Ranking */}
          <Link to="/ranking">
            <Card className="hover:shadow-card-hover transition-all duration-300 hover:scale-105 cursor-pointer h-full bg-card shadow-card">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <CardTitle>Ranking</CardTitle>
                <CardDescription>
                  Tabla de posiciones en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                  Ver Ranking
                </Button>
              </CardContent>
            </Card>
          </Link>

        </div>

          {/* Info adicional */}
          <div className="mt-16">
            <Card className="max-w-2xl mx-auto shadow-card">
              <CardHeader>
                <CardTitle className="text-center text-2xl">¿Cómo funciona?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-left">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">1️⃣</span>
                  <div>
                    <strong className="text-primary">Regístrate:</strong> Captura tu selfie una sola vez
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">2️⃣</span>
                  <div>
                    <strong className="text-primary">Participa:</strong> Participa en los concursos para obtener puntos, si eres ganador escanearás un QR desde la app Recompensas Herdez
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">3️⃣</span>
                  <div>
                    <strong className="text-primary">Escanea QR:</strong> Cada código QR es un concurso y puntos diferentes
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">4️⃣</span>
                  <div>
                    <strong className="text-primary">Valida tu rostro:</strong> Te identificamos automáticamente
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl flex-shrink-0">5️⃣</span>
                  <div>
                    <strong className="text-primary">Gana puntos:</strong> Acumula puntos en cada concurso
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

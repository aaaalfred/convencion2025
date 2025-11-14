import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Calendar, TrendingUp, User, AlertCircle, LogOut, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { SessionManager } from '@/lib/session';
import { apiUrl } from '@/lib/api-config';

interface Usuario {
  id: number;
  nombre: string;
  email: string | null;
  totalPuntos: number;
  fechaRegistro: string;
}

interface Participacion {
  id: number;
  concurso: string;
  codigo: string;
  puntos: number;
  fecha: string;
  hora: string;
}

export default function MiPerfil() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'checking' | 'camera' | 'loading' | 'profile' | 'not-found'>('checking');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [historial, setHistorial] = useState<Participacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Verificar sesión al cargar la página
  useEffect(() => {
    const checkSession = async () => {
      const session = SessionManager.get();

      if (session) {
        console.log('✅ Sesión activa encontrada:', session.nombre);
        // Cargar perfil usando sesión (sin foto)
        await fetchPerfilConSesion(session.usuarioId);
      } else {
        console.log('❌ No hay sesión activa, solicitar selfie');
        setStep('camera');
      }
    };

    checkSession();
  }, []);

  // Cargar perfil usando sesión (sin AWS Rekognition)
  const fetchPerfilConSesion = async (usuarioId: number) => {
    setStep('loading');

    try {
      const response = await fetch(apiUrl(`/api/usuarios/perfil-sesion/${usuarioId}`));
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Sesión inválida');
      }

      setUsuario(data.data.usuario);
      setHistorial(data.data.historial || []);
      setStep('profile');
      console.log('✅ Perfil cargado con sesión (sin selfie)');
    } catch (error) {
      console.error('Error al cargar perfil con sesión:', error);
      // Sesión inválida, limpiar y pedir selfie
      SessionManager.clear();
      toast.info('Sesión expirada. Por favor identifícate de nuevo');
      setStep('camera');
    }
  };

  const handleCameraCapture = async (imageBase64: string) => {
    setStep('loading');
    setError(null);

    try {
      const response = await fetch(apiUrl('/api/usuarios/perfil'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foto: imageBase64
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar perfil');
      }

      if (data.success) {
        // Guardar sesión de 24 horas
        SessionManager.save({
          sessionToken: data.data.sessionToken,
          usuarioId: data.data.usuario.id,
          nombre: data.data.usuario.nombre,
          email: data.data.usuario.email,
          expiresAt: data.data.expiresAt
        });

        console.log('✅ Sesión guardada después de identificación facial');

        setUsuario(data.data.usuario);
        setHistorial(data.data.historial || []);
        setStep('profile');
        toast.success(`¡Bienvenido ${data.data.usuario.nombre}!`);
      } else {
        throw new Error(data.error || 'Usuario no encontrado');
      }
    } catch (error) {
      console.error('Error al buscar perfil:', error);

      if (error instanceof Error) {
        if (error.message.includes('Usuario no encontrado') || error.message.includes('no está registrado')) {
          setError('No te reconocemos. ¿Es tu primera vez? Regístrate primero.');
          setStep('not-found');
          toast.error('Usuario no encontrado');
        } else if (error.message.includes('No se detectó ningún rostro')) {
          toast.error('No se detectó ningún rostro en la foto. Por favor intenta de nuevo.');
          setStep('camera');
        } else if (error.message.includes('múltiples rostros')) {
          toast.error('Se detectaron múltiples rostros. Por favor asegúrate de estar solo en la foto.');
          setStep('camera');
        } else {
          setError(error.message);
          toast.error(error.message);
          setStep('not-found');
        }
      } else {
        setError('Error al conectar con el servidor');
        toast.error('Error al conectar con el servidor');
        setStep('not-found');
      }
    }
  };

  const handleRetry = () => {
    setStep('camera');
    setError(null);
  };

  const handleCerrarSesion = () => {
    SessionManager.clear();
    toast.success('Sesión cerrada correctamente');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Mi Perfil" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">

            {/* Paso 1: Captura de cámara para identificarse */}
            {step === 'camera' && (
              <div className="space-y-4">
                <Card className="bg-accent/5 border-accent/30">
                  <CardContent className="pt-6">
                    <p className="text-sm text-foreground">
                      <strong className="text-accent">Identificación por rostro:</strong> Tómate una selfie para que
                      te identifiquemos y mostremos tu perfil completo.
                    </p>
                  </CardContent>
                </Card>

              <CameraCapture
                onCapture={handleCameraCapture}
                buttonText="Identificarme"
              />
            </div>
          )}

            {/* Paso 2: Cargando */}
            {step === 'loading' && (
              <Card className="p-12 text-center shadow-card">
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Identificando...</h3>
                <p className="text-muted-foreground">
                  Buscando tu rostro en nuestra base de datos
                </p>
              </Card>
            )}

            {/* Paso 2.5: Usuario no encontrado */}
            {step === 'not-found' && (
              <div className="space-y-4">
                <Card className="text-center shadow-card">
                  <CardContent className="pt-12 pb-12">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">
                      Usuario no encontrado
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {error || 'No te reconocemos. ¿Es tu primera vez?'}
                    </p>
                    <div className="flex flex-col space-y-3">
                      <Button
                        onClick={() => navigate('/registro')}
                        className="w-full bg-gradient-to-r from-primary to-orange-500"
                        size="lg"
                      >
                        Registrarme ahora
                      </Button>
                      <Button
                        onClick={handleRetry}
                        variant="outline"
                        className="w-full"
                      >
                        Intentar de nuevo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Paso 3: Perfil completo */}
            {step === 'profile' && usuario && (
              <div className="space-y-6">

                {/* Header del perfil */}
                <Card className="shadow-card">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl">{usuario.nombre}</CardTitle>
                        <CardDescription>
                          {usuario.email && <span>{usuario.email} • </span>}
                          Miembro desde {usuario.fechaRegistro}
                        </CardDescription>
                        {SessionManager.isActive() && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                              <Clock className="w-3 h-3 mr-1" />
                              Sesión activa: {SessionManager.getTimeRemaining()}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant="outline" className="text-xs">
                          ID: {usuario.id}
                        </Badge>
                        <Button
                          onClick={handleCerrarSesion}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <LogOut className="w-3 h-3 mr-1" />
                          Cerrar Sesión
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Balance de puntos */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-primary to-orange-500 text-white shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3 mb-2">
                        <Trophy className="w-6 h-6" />
                        <div className="text-sm opacity-90">Puntos totales</div>
                      </div>
                      <div className="text-4xl font-bold">{usuario.totalPuntos}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3 mb-2 text-accent">
                        <Calendar className="w-6 h-6" />
                        <div className="text-sm">Participaciones</div>
                      </div>
                      <div className="text-4xl font-bold">{historial.length}</div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-3 mb-2 text-green-600">
                        <TrendingUp className="w-6 h-6" />
                        <div className="text-sm">Promedio</div>
                      </div>
                      <div className="text-4xl font-bold">
                        {historial.length > 0 ? Math.round(usuario.totalPuntos / historial.length) : 0}
                      </div>
                      <div className="text-xs text-muted-foreground">puntos por concurso</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Historial de participaciones */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Historial de Participaciones</CardTitle>
                    <CardDescription>
                      Todos los concursos en los que has participado
                    </CardDescription>
                  </CardHeader>
                <CardContent>
                  {historial.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concurso</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead className="text-right">Puntos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historial.map((participacion) => (
                          <TableRow key={participacion.id}>
                            <TableCell className="font-medium">
                              {participacion.concurso}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {participacion.codigo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {participacion.fecha} {participacion.hora}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-600">
                                +{participacion.puntos}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Aún no has participado en ningún concurso</p>
                      <Button
                        onClick={() => navigate('/')}
                        variant="link"
                        className="mt-2"
                      >
                        Explorar concursos
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

                {/* Estadísticas adicionales */}
                {historial.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card className="bg-primary/5 border-primary/30 shadow-card">
                      <CardHeader>
                        <CardTitle className="text-lg">🏆 Mayor concurso</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const maxParticipacion = historial.reduce((max, p) => p.puntos > max.puntos ? p : max);
                          return (
                            <>
                              <div className="font-semibold text-foreground">{maxParticipacion.concurso}</div>
                              <div className="text-2xl font-bold text-primary">{maxParticipacion.puntos} puntos</div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    <Card className="bg-accent/5 border-accent/30 shadow-card">
                      <CardHeader>
                        <CardTitle className="text-lg">📅 Última participación</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="font-semibold text-foreground">
                          {historial[0].concurso}
                        </div>
                        <div className="text-2xl font-bold text-accent">
                          {historial[0].fecha}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

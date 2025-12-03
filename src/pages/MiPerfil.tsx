import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, Calendar, TrendingUp, User, AlertCircle, LogOut, Clock, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { SessionManager } from '@/lib/session';
import { apiUrl } from '@/lib/api-config';

interface Usuario {
  id: number;
  nombre: string;
  email: string | null;
  totalPuntos: number;
  fechaRegistro: string;
  fotoUrl?: string;
}

interface Participacion {
  id: number;
  concurso: string;
  codigo: string;
  puntos: number;
  fecha: string;
  ganador: string; // Nombre de quien ganó los puntos
  esAcompanante: boolean; // true si los puntos fueron ganados por el acompañante
  hora: string;
  tipo?: 'concurso' | 'trivia'; // Tipo de participación
}

interface Acompanante {
  id: number;
  nombre: string;
  email: string | null;
  numeroEmpleado: string;
  sucursal: string;
  puesto: string;
  totalPuntos: number;
  fotoUrl: string;
  fechaRegistro: string;
  fechaVinculacion: string;
}

export default function MiPerfil() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const [step, setStep] = useState<'checking' | 'camera' | 'loading' | 'profile' | 'not-found'>('checking');
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [historial, setHistorial] = useState<Participacion[]>([]);
  const [acompanante, setAcompanante] = useState<Acompanante | null>(null);
  const [loadingAcompanante, setLoadingAcompanante] = useState(false);
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

      // Cargar acompañante si existe
      await fetchAcompanante(usuarioId);
    } catch (error) {
      console.error('Error al cargar perfil con sesión:', error);
      // Sesión inválida, limpiar y pedir selfie
      SessionManager.clear();
      toast.info('Sesión expirada. Por favor identifícate de nuevo');
      setStep('camera');
    }
  };

  // Cargar acompañante del usuario
  const fetchAcompanante = async (usuarioId: number) => {
    setLoadingAcompanante(true);

    try {
      const response = await fetch(apiUrl(`/api/usuarios/${usuarioId}/acompanante`));
      const data = await response.json();

      if (data.success && data.tieneAcompanante) {
        setAcompanante(data.data);
        console.log('✅ Acompañante cargado:', data.data.nombre);
      } else {
        setAcompanante(null);
        console.log('ℹ️ No tiene acompañante registrado');
      }
    } catch (error) {
      console.error('Error al cargar acompañante:', error);
      setAcompanante(null);
    } finally {
      setLoadingAcompanante(false);
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

        // Si hay returnUrl, redirigir después de un momento
        if (returnUrl) {
          setTimeout(() => {
            navigate(returnUrl);
          }, 1500);
        }

        // Cargar acompañante si existe
        await fetchAcompanante(data.data.usuario.id);
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
                      {usuario.fotoUrl ? (
                        <img src={usuario.fotoUrl} alt={usuario.nombre} className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-full flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                      )}
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
                      {acompanante && (
                        <div className="mt-3 pt-3 border-t border-white/20 text-sm">
                          <div className="flex justify-between opacity-90">
                            <span>Tus puntos:</span>
                            <span className="font-semibold">{usuario.totalPuntos - acompanante.totalPuntos}</span>
                          </div>
                          <div className="flex justify-between opacity-90 mt-1">
                            <span>Acompañante:</span>
                            <span className="font-semibold">+{acompanante.totalPuntos}</span>
                          </div>
                        </div>
                      )}
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
                          <TableHead>Ganado por</TableHead>
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
                              <Badge
                                variant={participacion.tipo === 'trivia' ? 'default' : 'outline'}
                                className={`text-xs ${participacion.tipo === 'trivia' ? 'bg-purple-600' : ''}`}
                              >
                                {participacion.tipo === 'trivia' ? '🎯 TRIVIA' : participacion.codigo.replace(/_\d+$/, '')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {participacion.fecha} {participacion.hora}
                            </TableCell>
                            <TableCell>
                              <Badge variant={participacion.esAcompanante ? "default" : "secondary"} className="text-xs">
                                {participacion.esAcompanante && <Users className="w-3 h-3 mr-1" />}
                                {participacion.ganador}
                              </Badge>
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

                {/* Sección de Acompañante */}
                {loadingAcompanante ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Cargando acompañante...</p>
                    </CardContent>
                  </Card>
                ) : acompanante ? (
                  <Card className="shadow-card border-purple-200">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {acompanante.fotoUrl ? (
                          <img src={acompanante.fotoUrl} alt={acompanante.nombre} className="w-10 h-10 rounded-full object-cover border-2 border-purple-400" />
                        ) : (
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <CardTitle>Acompañante</CardTitle>
                          <CardDescription>
                            Los puntos de {acompanante.nombre} suman a tu cuenta
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-semibold">{acompanante.nombre}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Puntos acumulados</p>
                          <p className="font-semibold text-green-600 text-xl">
                            {acompanante.totalPuntos}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Número de empleado</p>
                          <p className="font-semibold">{acompanante.numeroEmpleado}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Sucursal</p>
                          <p className="font-semibold">{acompanante.sucursal}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Puesto</p>
                          <p className="font-semibold">{acompanante.puesto}</p>
                        </div>
                        {acompanante.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-semibold text-sm">{acompanante.email}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                        Registrado como acompañante el {new Date(acompanante.fechaVinculacion).toLocaleDateString('es-MX')}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="shadow-card">
                    <CardContent className="pt-6 text-center">
                      <UserPlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        Aún no has registrado un acompañante
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Los puntos que gane tu acompañante sumarán automáticamente a tu cuenta
                      </p>
                      <Button onClick={() => navigate('/agregar-acompanante')}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Agregar acompañante
                      </Button>
                    </CardContent>
                  </Card>
                )}

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

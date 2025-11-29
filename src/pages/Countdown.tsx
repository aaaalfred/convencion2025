import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api-config';
import { SessionManager } from '@/lib/session';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface Pregunta {
  id: number;
  pregunta: string;
  opcion_a: string;
  opcion_b: string;
  opcion_c: string;
  opcion_d: string;
  puntos: number;
  trivia_id: number;
}

interface Resultado {
  esCorrecta: boolean;
  respuestaCorrecta: string;
  puntosGanados: number;
  puntajeDinamico: number;
  totalPuntos: number;
  mensaje: string;
  trivia?: {
    id: number;
    nombre: string;
  };
}

interface TriviaActiva {
  triviaId: number;
  nombre: string;
  descripcion?: string;
  puntajeActual: number;
  yaParticipo: boolean;
}

interface TriviaProxima {
  id: number;
  nombre: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  puntosMaximos: number;
  puntosMinimos: number;
}

// Parsear fecha del servidor (viene en formato ISO UTC)
const parseFechaMexico = (fechaStr: string): Date => {
  // La fecha viene como ISO UTC: '2025-11-26T21:20:00.000Z'
  // new Date() la parsea correctamente
  return new Date(fechaStr);
};

const Countdown = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Función para navegar con returnUrl
  const navigateWithReturn = (path: string) => {
    navigate(`${path}?returnUrl=${encodeURIComponent(location.pathname)}`);
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isExpired, setIsExpired] = useState(false);
  const [triviaProxima, setTriviaProxima] = useState<TriviaProxima | null>(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [tieneSesion, setTieneSesion] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargandoPregunta, setCargandoPregunta] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);
  const [triviaActiva, setTriviaActiva] = useState<TriviaActiva | null>(null);
  const [cargandoTrivia, setCargandoTrivia] = useState(false);
  const [puntajeTiempoReal, setPuntajeTiempoReal] = useState<number>(0);

  // Cargar próxima trivia desde la API
  useEffect(() => {
    const cargarTrivia = async () => {
      try {
        const response = await fetch(apiUrl('/api/trivias/proxima'));
        const data = await response.json();

        if (data.success) {
          setTriviaProxima(data.data);
        } else {
          toast.error('No hay trivias configuradas en este momento');
        }
      } catch (error) {
        console.error('Error al cargar trivia:', error);
        toast.error('Error al cargar la trivia');
      } finally {
        setCargandoConfig(false);
      }
    };

    cargarTrivia();
  }, []);

  // Verificar sesión activa
  useEffect(() => {
    const verificarSesion = () => {
      const session = SessionManager.get();
      if (session) {
        setTieneSesion(true);
        setNombreUsuario(session.nombre || 'Usuario');
      } else {
        setTieneSesion(false);
        setNombreUsuario('');
      }
    };

    verificarSesion();
    // Re-verificar cada 5 segundos por si se autentica en otra pestaña
    const interval = setInterval(verificarSesion, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cargar trivia activa cuando termine el countdown
  useEffect(() => {
    if (isExpired && !triviaActiva && !cargandoTrivia && tieneSesion) {
      cargarTriviaActiva();
    }
  }, [isExpired, tieneSesion]);

  // Actualizar puntaje en tiempo real mientras la trivia está activa
  useEffect(() => {
    if (triviaActiva && !triviaActiva.yaParticipo && !resultado) {
      setPuntajeTiempoReal(triviaActiva.puntajeActual);

      // Actualizar cada segundo
      const interval = setInterval(async () => {
        const session = SessionManager.get();
        const usuarioId = session?.usuarioId;

        if (usuarioId) {
          try {
            const response = await fetch(apiUrl(`/api/trivias/activa?usuarioId=${usuarioId}`));
            const data = await response.json();

            if (data.success) {
              setPuntajeTiempoReal(data.data.puntajeActual);
            }
          } catch (error) {
            console.error('Error actualizando puntaje:', error);
          }
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [triviaActiva, resultado]);

  // Calcular tiempo restante
  useEffect(() => {
    if (!triviaProxima) return;

    const calculateTimeLeft = () => {
      const targetDate = parseFechaMexico(triviaProxima.fechaInicio);
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        setIsExpired(true);
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [triviaProxima]);

  const cargarTriviaActiva = async () => {
    setCargandoTrivia(true);
    try {
      const session = SessionManager.get();
      const usuarioId = session?.usuarioId;

      if (!usuarioId) {
        toast.error('Debes autenticarte primero');
        setCargandoTrivia(false);
        return;
      }

      const response = await fetch(apiUrl(`/api/trivias/activa?usuarioId=${usuarioId}`));
      const data = await response.json();

      if (data.success) {
        setTriviaActiva(data.data);
        setPuntajeTiempoReal(data.data.puntajeActual);

        // Si ya participó, mostrar mensaje
        if (data.data.yaParticipo) {
          toast.info(`Ya participaste en "${data.data.nombre}"`);
        } else {
          // Si no ha participado, cargar pregunta
          await cargarPregunta(data.data.triviaId);
        }
      } else {
        toast.error(data.error || 'No hay trivias activas en este momento');
      }
    } catch (error) {
      console.error('Error al cargar trivia activa:', error);
      toast.error('Error al cargar la trivia');
    } finally {
      setCargandoTrivia(false);
    }
  };

  const cargarPregunta = async (triviaId: number) => {
    setCargandoPregunta(true);
    try {
      const response = await fetch(apiUrl(`/api/preguntas/random?triviaId=${triviaId}`));
      const data = await response.json();

      if (data.success) {
        setPregunta(data.data);
      } else {
        toast.error('No se pudo cargar la pregunta');
      }
    } catch (error) {
      console.error('Error al cargar pregunta:', error);
      toast.error('Error al cargar la pregunta');
    } finally {
      setCargandoPregunta(false);
    }
  };

  const enviarRespuesta = async () => {
    if (!respuestaSeleccionada || !pregunta || !triviaActiva) return;

    // Obtener usuario de sesión (si existe)
    const session = SessionManager.get();
    const usuarioId = session ? session.usuarioId : null;

    if (!usuarioId) {
      toast.error('Debes registrarte primero para ganar puntos');
      return;
    }

    setEnviandoRespuesta(true);
    try {
      const response = await fetch(apiUrl('/api/preguntas/responder'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId,
          preguntaId: pregunta.id,
          respuesta: respuestaSeleccionada,
          triviaId: triviaActiva.triviaId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResultado(data.data);
        if (data.data.esCorrecta) {
          toast.success(data.data.mensaje);
        } else {
          toast.error(data.data.mensaje);
        }
      } else {
        // Manejar caso de "ya participó"
        if (data.tipo === 'ya_participo') {
          toast.warning(data.error);
          setTriviaActiva({ ...triviaActiva, yaParticipo: true });
        } else {
          toast.error(data.error || 'Error al enviar respuesta');
        }
      }
    } catch (error) {
      console.error('Error al enviar respuesta:', error);
      toast.error('Error al enviar la respuesta');
    } finally {
      setEnviandoRespuesta(false);
    }
  };

  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-6 bg-gradient-to-br from-purple-600 to-blue-600 border-0 shadow-2xl">
        <div className="text-center">
          <motion.div
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-6xl md:text-7xl font-bold text-white mb-2"
          >
            {String(value).padStart(2, '0')}
          </motion.div>
          <div className="text-sm md:text-base text-purple-100 uppercase tracking-wider font-semibold">
            {label}
          </div>
        </div>
      </Card>
    </motion.div>
  );

  // Formatear fecha para mostrar (siempre en hora de México)
  const formatearFecha = (fechaStr: string) => {
    const fecha = parseFechaMexico(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Mostrar loading mientras carga la configuración
  if (cargandoConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            Cargando...
          </h2>
        </Card>
      </div>
    );
  }

  if (!triviaProxima) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            No hay trivias configuradas
          </h2>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          {/* Logos Herdez y Campeones SAHUAYO */}
          <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-6 md:gap-12">
            <img
              src="/herdez-logo.webp"
              alt="Herdez"
              className="h-16 md:h-24 w-auto object-contain drop-shadow-2xl"
            />
            <img
              src="/logo-campeones-sahuayo.png"
              alt="Campeones SAHUAYO"
              className="h-20 md:h-28 w-auto object-contain drop-shadow-2xl"
            />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
            {isExpired ? '¡La trivia ha comenzado!' : 'Cuenta Regresiva'}
          </h1>
          <p className="text-xl md:text-2xl text-purple-200">
            {triviaProxima.nombre}
          </p>
          <p className="text-lg md:text-xl text-purple-300 mt-2">
            Inicia: {formatearFecha(triviaProxima.fechaInicio)}
          </p>
          <p className="text-base md:text-lg text-purple-300">
            Termina: {formatearFecha(triviaProxima.fechaFin)}
          </p>
        </motion.div>

        {/* Estado de Sesión - Siempre visible */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card className="max-w-2xl mx-auto bg-white/95 backdrop-blur-sm shadow-xl">
            <CardContent className="p-6">
              {tieneSesion ? (
                // Usuario autenticado
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                    <p className="text-lg font-semibold text-green-700">
                      Listo para Participar
                    </p>
                  </div>
                  <p className="text-gray-600">
                    Hola, <span className="font-semibold">{nombreUsuario}</span>. Estás preparado para responder cuando inicie el evento.
                  </p>
                </div>
              ) : (
                // Usuario NO autenticado
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-3 h-3 rounded-full bg-orange-500 animate-pulse"></div>
                    <p className="text-lg font-semibold text-orange-700">
                      Prepárate para Participar
                    </p>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Para ganar puntos necesitas identificarte. ¡Hazlo ahora para estar listo cuando inicie!
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button
                      onClick={() => navigateWithReturn('/registro')}
                      className="bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600"
                    >
                      Registrarme
                    </Button>
                    <Button
                      onClick={() => navigateWithReturn('/mi-perfil')}
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      Ya Tengo Cuenta
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {!isExpired ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            <TimeUnit value={timeLeft.days} label="Días" />
            <TimeUnit value={timeLeft.hours} label="Horas" />
            <TimeUnit value={timeLeft.minutes} label="Minutos" />
            <TimeUnit value={timeLeft.seconds} label="Segundos" />
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {!tieneSesion ? (
              <Card className="p-12 bg-gradient-to-br from-orange-600 to-red-600 border-0 shadow-2xl">
                <div className="text-center text-white">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      ¡El Evento Ha Comenzado!
                    </h2>
                    <p className="text-xl md:text-2xl mb-4">
                      Pero aún no estás autenticado
                    </p>
                    <p className="text-lg md:text-xl mb-8 text-white/90">
                      Otros participantes ya están respondiendo. ¡Regístrate o identifícate ahora para no perder más tiempo!
                    </p>
                    <div className="flex gap-4 justify-center flex-wrap">
                      <Button
                        onClick={() => navigateWithReturn('/registro')}
                        size="lg"
                        className="bg-white text-orange-600 hover:bg-white/90 font-bold text-lg px-8"
                      >
                        Registrarme Ahora
                      </Button>
                      <Button
                        onClick={() => navigateWithReturn('/mi-perfil')}
                        variant="outline"
                        size="lg"
                        className="border-2 border-white text-white hover:bg-white/20 font-bold text-lg px-8"
                      >
                        Identificarme
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </Card>
            ) : cargandoTrivia || cargandoPregunta ? (
              <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                  {cargandoTrivia ? 'Cargando trivia...' : 'Cargando pregunta...'}
                </h2>
              </Card>
            ) : triviaActiva?.yaParticipo ? (
              <Card className="p-8 md:p-12 bg-gradient-to-br from-blue-600 to-indigo-600 border-0 shadow-2xl">
                <div className="text-center text-white">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      Ya Participaste
                    </h2>
                    <p className="text-xl md:text-2xl mb-4">
                      {triviaActiva.nombre}
                    </p>
                    <p className="text-lg md:text-xl text-white/90">
                      Solo puedes participar una vez por trivia. ¡Espera la próxima!
                    </p>
                  </motion.div>
                </div>
              </Card>
            ) : pregunta && !resultado ? (
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl max-w-3xl mx-auto">
                <CardHeader className="bg-gradient-to-r from-primary to-orange-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl md:text-3xl text-center">
                    {triviaActiva?.nombre || '¡Responde y Gana Puntos!'}
                  </CardTitle>
                  <CardDescription className="text-white/90 text-center text-lg">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-center gap-2">
                        <motion.span
                          key={puntajeTiempoReal}
                          initial={{ scale: 1.2, color: '#ffffff' }}
                          animate={{ scale: 1, color: '#fcd34d' }}
                          transition={{ duration: 0.3 }}
                          className="text-2xl font-bold"
                        >
                          {puntajeTiempoReal}
                        </motion.span>
                        <span>puntos disponibles ahora</span>
                      </div>
                      <p className="text-sm text-white/70">
                        ⏱️ Los puntos disminuyen con el tiempo. ¡Responde rápido!
                      </p>
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">
                    {pregunta.pregunta}
                  </h3>

                  <div className="grid gap-4 mb-6">
                    {[
                      { letra: 'A', texto: pregunta.opcion_a },
                      { letra: 'B', texto: pregunta.opcion_b },
                      { letra: 'C', texto: pregunta.opcion_c },
                      { letra: 'D', texto: pregunta.opcion_d },
                    ].map((opcion) => (
                      <motion.button
                        key={opcion.letra}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRespuestaSeleccionada(opcion.letra)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          respuestaSeleccionada === opcion.letra
                            ? 'border-primary bg-primary/10 shadow-lg'
                            : 'border-gray-300 hover:border-primary/50 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                              respuestaSeleccionada === opcion.letra
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {opcion.letra}
                          </div>
                          <span className="text-base md:text-lg text-gray-800 font-medium">
                            {opcion.texto}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  <Button
                    onClick={enviarRespuesta}
                    disabled={!respuestaSeleccionada || enviandoRespuesta}
                    className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-white py-6 text-lg font-semibold"
                  >
                    {enviandoRespuesta ? 'Enviando...' : 'Enviar Respuesta'}
                  </Button>
                </CardContent>
              </Card>
            ) : resultado ? (
              <Card className={`p-8 md:p-12 border-0 shadow-2xl ${
                resultado.esCorrecta
                  ? 'bg-gradient-to-br from-green-600 to-emerald-600'
                  : 'bg-gradient-to-br from-red-600 to-pink-600'
              }`}>
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
                      {resultado.esCorrecta ? '¡Correcto!' : '¡Incorrecto!'}
                    </h2>
                    <p className="text-xl md:text-2xl text-white/90 mb-4">
                      {resultado.mensaje}
                    </p>
                    {resultado.esCorrecta && (
                      <div className="mt-6">
                        <p className="text-3xl md:text-5xl font-bold text-white">
                          +{resultado.puntosGanados} puntos
                        </p>
                        <p className="text-lg md:text-xl text-white/80 mt-2">
                          Total: {resultado.totalPuntos} puntos
                        </p>
                      </div>
                    )}
                    {!resultado.esCorrecta && (
                      <p className="text-lg md:text-xl text-white/90 mt-4">
                        Respuesta correcta: {resultado.respuestaCorrecta}
                      </p>
                    )}
                  </motion.div>
                </div>
              </Card>
            ) : null}
          </motion.div>
        )}

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <div className="inline-block">
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            >
              <Card className="px-8 py-4 bg-white/10 backdrop-blur-sm border-white/20">
                <p className="text-lg text-white font-semibold">
                  {triviaProxima.descripcion || 'Prepárate para la trivia'}
                </p>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Countdown;
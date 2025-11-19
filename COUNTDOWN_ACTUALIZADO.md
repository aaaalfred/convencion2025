# Countdown.tsx Actualizado - Con Configuración desde BD

## Instrucciones

1. Reemplaza el contenido completo de `src/pages/Countdown.tsx` con el código de abajo
2. Ejecuta el SQL en la base de datos (ver sección SQL)
3. Reconstruye el frontend: `npm run build`

---

## SQL a Ejecutar Primero

```bash
mysql -h 72.167.45.26 -u alfred -p expo25
```

Luego ejecuta:

```sql
-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS countdown_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL COMMENT 'Nombre del evento',
  fecha_objetivo DATETIME NOT NULL COMMENT 'Fecha y hora objetivo del countdown',
  descripcion TEXT COMMENT 'Descripción del evento',
  activo TINYINT DEFAULT 1 COMMENT '1=activo, 0=inactivo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) COMMENT='Configuración de countdowns para eventos';

-- Insertar configuración por defecto
INSERT INTO countdown_config (nombre, fecha_objetivo, descripcion, activo) VALUES
('Convención Nacional Sahuayo 2025', '2025-12-01 12:00:00', 'Evento principal de la Convención Nacional Herdez', 1);

-- Verificar
SELECT * FROM countdown_config WHERE activo = 1 ORDER BY fecha_objetivo ASC LIMIT 1;
```

---

## Código Completo de Countdown.tsx

Reemplaza **TODO** el contenido de `src/pages/Countdown.tsx` con esto:

```tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiUrl } from '@/lib/api-config';

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
}

interface Resultado {
  esCorrecta: boolean;
  respuestaCorrecta: string;
  puntosGanados: number;
  totalPuntos: number;
  mensaje: string;
}

interface CountdownConfig {
  id: number;
  nombre: string;
  fechaObjetivo: string;
  descripcion: string | null;
}

const Countdown = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isExpired, setIsExpired] = useState(false);
  const [countdownConfig, setCountdownConfig] = useState<CountdownConfig | null>(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [respuestaSeleccionada, setRespuestaSeleccionada] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargandoPregunta, setCargandoPregunta] = useState(false);
  const [enviandoRespuesta, setEnviandoRespuesta] = useState(false);

  // Cargar configuración del countdown desde la API
  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const response = await fetch(apiUrl('/api/countdown/config'));
        const data = await response.json();

        if (data.success) {
          setCountdownConfig(data.data);
        } else {
          toast.error('No se pudo cargar la configuración del countdown');
          // Fecha por defecto si falla la carga
          setCountdownConfig({
            id: 0,
            nombre: 'Evento Próximamente',
            fechaObjetivo: '2025-12-01T12:00:00',
            descripcion: null
          });
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        toast.error('Error al cargar la configuración');
        // Fecha por defecto si falla la carga
        setCountdownConfig({
          id: 0,
          nombre: 'Evento Próximamente',
          fechaObjetivo: '2025-12-01T12:00:00',
          descripcion: null
        });
      } finally {
        setCargandoConfig(false);
      }
    };

    cargarConfig();
  }, []);

  // Cargar pregunta cuando termine el countdown
  useEffect(() => {
    if (isExpired && !pregunta && !cargandoPregunta) {
      cargarPregunta();
    }
  }, [isExpired]);

  // Calcular tiempo restante
  useEffect(() => {
    if (!countdownConfig) return;

    const calculateTimeLeft = () => {
      const targetDate = new Date(countdownConfig.fechaObjetivo);
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
  }, [countdownConfig]);

  const cargarPregunta = async () => {
    setCargandoPregunta(true);
    try {
      const response = await fetch(apiUrl('/api/preguntas/random'));
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
    if (!respuestaSeleccionada || !pregunta) return;

    // Obtener usuario de sesión (si existe)
    const usuarioData = localStorage.getItem('usuarioData');
    const usuarioId = usuarioData ? JSON.parse(usuarioData).usuarioId : null;

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
        toast.error(data.error || 'Error al enviar respuesta');
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

  // Formatear fecha para mostrar
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-MX', {
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

  if (!countdownConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
            No hay countdown configurado
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
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
            {isExpired ? 'El evento ha comenzado!' : 'Cuenta Regresiva'}
          </h1>
          <p className="text-xl md:text-2xl text-purple-200">
            {countdownConfig.nombre}
          </p>
          <p className="text-lg md:text-xl text-purple-300 mt-2">
            {formatearFecha(countdownConfig.fechaObjetivo)}
          </p>
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
            {cargandoPregunta ? (
              <Card className="p-12 bg-white/10 backdrop-blur-sm border-white/20 shadow-2xl">
                <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
                  Cargando pregunta...
                </h2>
              </Card>
            ) : pregunta && !resultado ? (
              <Card className="bg-white/95 backdrop-blur-sm shadow-2xl max-w-3xl mx-auto">
                <CardHeader className="bg-gradient-to-r from-primary to-orange-500 text-white rounded-t-lg">
                  <CardTitle className="text-2xl md:text-3xl text-center">
                    ¡Responde y Gana Puntos!
                  </CardTitle>
                  <CardDescription className="text-white/90 text-center text-lg">
                    {pregunta.puntos} puntos disponibles
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
                  {countdownConfig.descripcion || 'Prepárate para algo increíble'}
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
```

---

## Cambios Principales

1. **Nueva interfaz `CountdownConfig`** para tipar los datos de la API
2. **Nuevo estado `countdownConfig`** que guarda la configuración desde BD
3. **Nuevo estado `cargandoConfig`** para mostrar loading inicial
4. **useEffect para cargar config** al montar el componente
5. **useEffect del timer** ahora depende de `countdownConfig` en lugar de ejecutarse siempre
6. **Función `formatearFecha`** para mostrar la fecha en español
7. **Pantallas de loading** mientras carga la configuración
8. **Fecha dinámica** tomada de `countdownConfig.fechaObjetivo`
9. **Nombre dinámico** tomado de `countdownConfig.nombre`
10. **Descripción dinámica** tomada de `countdownConfig.descripcion` (con fallback)

---

## Cómo Cambiar la Fecha del Countdown

Ahora para cambiar la fecha, solo ejecuta SQL:

```sql
-- Ver configuración actual
SELECT * FROM countdown_config WHERE activo = 1;

-- Cambiar la fecha
UPDATE countdown_config
SET fecha_objetivo = '2025-12-15 18:00:00',
    nombre = 'Gran Inauguración 2025',
    descripcion = 'El evento más esperado del año'
WHERE activo = 1;
```

NO necesitas tocar el código ni hacer rebuild del frontend.

---

## Para Probar

1. Ejecuta el SQL arriba
2. Copia el código completo de Countdown.tsx
3. Reconstruye: `npm run build`
4. Reinicia servidor: `npm run server`
5. Abre: `http://localhost:3002/countdown`

---

Última actualización: 18 de Noviembre 2024

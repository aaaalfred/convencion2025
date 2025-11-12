import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { ResultadoModal, ResultadoData } from '@/components/shared/ResultadoModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { SessionManager } from '@/lib/session';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ConcursoData {
  nombre: string;
  descripcion: string;
  puntosOtorgados: number;
  activo: boolean;
}

export default function Concurso() {
  const { codigo } = useParams<{ codigo: string }>();
  const [step, setStep] = useState<'loading' | 'info' | 'camera' | 'validating' | 'result'>('loading');
  const [resultado, setResultado] = useState<ResultadoData | null>(null);
  const [concurso, setConcurso] = useState<ConcursoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar información del concurso al montar el componente
  useEffect(() => {
    if (codigo) {
      fetchConcurso();
    }
  }, [codigo]);

  const fetchConcurso = async () => {
    try {
      setStep('loading');
      const response = await fetch(`${API_URL}/api/concursos/${codigo}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar concurso');
      }

      if (data.success) {
        setConcurso(data.data);
        setStep('info');
      } else {
        throw new Error(data.error || 'Concurso no encontrado');
      }
    } catch (error) {
      console.error('Error al cargar concurso:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Error al conectar con el servidor');
      }
      setStep('info');
    }
  };

  // Mostrar loading mientras carga el concurso
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showBackButton title="Cargando..." />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  // Mostrar error si no se pudo cargar el concurso
  if (!concurso || error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header showBackButton />
        <div className="flex-1">
          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto text-center shadow-card">
              <CardContent className="pt-12 pb-12">
                <h2 className="text-2xl font-bold text-destructive mb-4">
                  Concurso no encontrado
                </h2>
                <p className="text-muted-foreground">
                  {error || 'El código QR escaneado no corresponde a ningún concurso activo.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleContinuar = () => {
    setStep('camera');
  };

  const handleCameraCapture = async (imageBase64: string) => {
    setStep('validating');

    try {
      const response = await fetch(`${API_URL}/api/concursos/${codigo}/participar`, {
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
        throw new Error(data.error || 'Error al participar en el concurso');
      }

      if (data.success) {
        let resultadoData: ResultadoData;

        switch (data.tipo) {
          case 'exito':
            // Renovar sesión al participar exitosamente
            SessionManager.renew();
            console.log('🔄 Sesión renovada por 24 horas más después de participar');

            resultadoData = {
              tipo: 'exito',
              mensaje: data.mensaje,
              usuario: {
                nombre: data.data.usuario.nombre,
                totalPuntos: data.data.usuario.totalPuntos
              },
              puntosGanados: data.data.puntosGanados
            };
            toast.success('¡Puntos acumulados!');
            break;

          case 'ya-participaste':
            resultadoData = {
              tipo: 'ya-participaste',
              mensaje: data.mensaje,
              usuario: {
                nombre: data.data.nombre,
                totalPuntos: data.data.totalPuntos
              },
              participacion: {
                fecha: data.data.participacion.fecha,
                puntosGanados: data.data.participacion.puntosGanados
              }
            };
            toast.info('Ya participaste en este concurso');
            break;

          case 'no-registrado':
            resultadoData = {
              tipo: 'no-registrado',
              mensaje: data.mensaje
            };
            toast.warning('Usuario no registrado');
            break;

          default:
            throw new Error('Tipo de respuesta desconocido');
        }

        setResultado(resultadoData);
        setStep('result');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error al participar:', error);

      let resultadoData: ResultadoData;

      if (error instanceof Error) {
        if (error.message.includes('No se detectó ningún rostro')) {
          toast.error('No se detectó ningún rostro en la foto');
          setStep('camera');
          return;
        } else if (error.message.includes('múltiples rostros')) {
          toast.error('Se detectaron múltiples rostros');
          setStep('camera');
          return;
        } else {
          resultadoData = {
            tipo: 'error',
            mensaje: error.message
          };
        }
      } else {
        resultadoData = {
          tipo: 'error',
          mensaje: 'Error al conectar con el servidor'
        };
      }

      toast.error('Error al procesar la participación');
      setResultado(resultadoData);
      setStep('result');
    }
  };

  const handleReintentar = () => {
    setStep('camera');
    setResultado(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Concurso" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">

          {/* Paso 1: Información del concurso */}
          {step === 'info' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{concurso.nombre}</CardTitle>
                      <CardDescription>{concurso.descripcion}</CardDescription>
                    </div>
                    <QrCode className="w-12 h-12 text-primary flex-shrink-0 ml-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 border border-primary/30 rounded-lg p-6 text-center">
                    <div className="text-sm text-primary mb-2 font-medium">Puntos a ganar</div>
                    <div className="text-5xl font-bold text-primary mb-2">
                      {concurso.puntosOtorgados}
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span className="text-sm text-primary font-medium">puntos</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      ✓ Concurso activo
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                      Código: {codigo}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold text-blue-900">📸 Para participar:</h3>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>Tómate una selfie para validar tu identidad</li>
                    <li>Te identificaremos automáticamente con reconocimiento facial</li>
                    <li>Si nunca has participado, ganarás {concurso.puntosOtorgados} puntos</li>
                    <li>Solo puedes participar una vez en este concurso</li>
                  </ol>
                </CardContent>
              </Card>

              <Button
                onClick={handleContinuar}
                className="w-full bg-primary hover:bg-primary/90"
                size="lg"
              >
                Tomar Selfie para Participar →
              </Button>
            </div>
          )}

          {/* Paso 2: Captura de cámara */}
          {step === 'camera' && (
            <div className="space-y-4">
              <Card className="bg-primary/5 border-primary/30">
                <CardContent className="pt-6">
                  <p className="text-sm text-foreground">
                    <strong className="text-primary">Validación facial:</strong> Captura tu selfie para que te identifiquemos
                    automáticamente. Asegúrate de estar bien iluminado.
                  </p>
                </CardContent>
              </Card>

              <CameraCapture
                onCapture={handleCameraCapture}
                buttonText="Participar"
              />

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setStep('info')}
                >
                  ← Volver
                </Button>
              </div>
            </div>
          )}

          {/* Paso 3: Validando */}
          {step === 'validating' && (
            <Card className="p-12 text-center shadow-card">
              <Loader2 className="w-20 h-20 animate-spin text-primary mx-auto mb-6" />
              <h3 className="text-2xl font-semibold mb-3">Validando tu identidad...</h3>
              <p className="text-muted-foreground mb-4">
                Estamos comparando tu rostro con nuestra base de datos
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✓ Foto capturada</p>
                <p>⏳ Enviando a AWS Rekognition...</p>
                <p>⏳ Identificando usuario...</p>
                <p>⏳ Verificando participaciones...</p>
              </div>
            </Card>
          )}

          {/* Paso 4: Resultado */}
          {step === 'result' && resultado && (
            <div>
              <ResultadoModal
                resultado={resultado}
                onClose={resultado.tipo === 'error' ? handleReintentar : undefined}
              />
            </div>
          )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

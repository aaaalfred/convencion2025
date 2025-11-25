import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, CheckCircle, XCircle, AlertCircle, UserPlus } from 'lucide-react';
import { SessionManager } from '@/lib/session';
import { apiUrl } from '@/lib/api-config';

export default function AgregarAcompanante() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'verificar-principal' | 'form' | 'camera' | 'success'>('loading');
  const [loading, setLoading] = useState(false);
  const [verificandoPrincipal, setVerificandoPrincipal] = useState(false);
  const [usuarioPrincipalId, setUsuarioPrincipalId] = useState<number | null>(null);
  const [nombrePrincipal, setNombrePrincipal] = useState<string>('');

  // Datos del formulario
  const [numeroPrincipal, setNumeroPrincipal] = useState('');
  const [acompananteData, setAcompananteData] = useState({
    nombre: '',
    email: ''
  });

  // Verificar si hay sesión activa
  useEffect(() => {
    const checkSessionAndAcompanante = async () => {
      const session = SessionManager.get();
      if (session && session.usuarioId) {
        // Usuario autenticado, verificar si ya tiene acompañante
        try {
          const response = await fetch(apiUrl(`/api/usuarios/${session.usuarioId}/acompanante`));
          const data = await response.json();

          if (data.success && data.tieneAcompanante) {
            toast.error('Ya tienes un acompañante registrado');
            navigate('/mi-perfil');
            return;
          }

          // No tiene acompañante, proceder con el registro
          setUsuarioPrincipalId(session.usuarioId);
          setNombrePrincipal(session.nombre);
          setStep('form');
          console.log('✅ Usuario autenticado, ir directo al formulario de acompañante');
        } catch (error) {
          console.error('Error verificando acompañante:', error);
          toast.error('Error al verificar si tienes acompañante');
        }
      } else {
        // No hay sesión, mostrar verificación de número de empleado
        setStep('verificar-principal');
        console.log('ℹ️ No hay sesión activa, solicitar verificación');
      }
    };

    checkSessionAndAcompanante();
  }, [navigate]);


  const handleVerificarPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!numeroPrincipal.trim()) {
      toast.error('Por favor ingresa tu número de empleado');
      return;
    }

    setVerificandoPrincipal(true);

    try {
      // Buscar usuario por número de empleado
      const response = await fetch(apiUrl(`/api/numeros-empleado/validar/${numeroPrincipal}`));
      const data = await response.json();

      if (!data.success || data.yaRegistrado !== true) {
        toast.error('Número de empleado no encontrado. Debes estar registrado primero.');
        return;
      }

      // Verificar que no tenga ya un acompañante
      const checkResponse = await fetch(apiUrl(`/api/usuarios/${data.usuario.id}/acompanante`));
      const checkData = await checkResponse.json();

      if (checkData.tieneAcompanante) {
        toast.error('Ya tienes un acompañante registrado');
        navigate('/mi-perfil');
        return;
      }

      setUsuarioPrincipalId(data.usuario.id);
      setNombrePrincipal(data.usuario.nombre);
      setStep('form');
      toast.success(`¡Bienvenido ${data.usuario.nombre}! Ahora registra a tu acompañante`);

    } catch (error) {
      console.error('Error verificando usuario:', error);
      toast.error('Error al verificar usuario. Por favor intenta de nuevo.');
    } finally {
      setVerificandoPrincipal(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acompananteData.nombre.trim()) {
      toast.error('Por favor ingresa el nombre del acompañante');
      return;
    }

    setStep('camera');
  };

  const handleCameraCapture = async (imageBase64: string) => {
    if (!usuarioPrincipalId) {
      toast.error('Error: No se encontró el ID del usuario principal');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/acompanantes/registro'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: acompananteData.nombre,
          email: acompananteData.email || null,
          foto: imageBase64,
          usuarioPrincipalId: usuarioPrincipalId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar acompañante');
      }

      if (data.success) {
        setStep('success');
        toast.success('¡Acompañante registrado exitosamente!');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error en registro de acompañante:', error);

      if (error instanceof Error) {
        if (error.message.includes('No se detectó ningún rostro')) {
          toast.error('No se detectó ningún rostro en la foto. Por favor intenta de nuevo.');
          setStep('camera');
        } else if (error.message.includes('múltiples rostros')) {
          toast.error('Se detectaron múltiples rostros. Por favor asegúrate de estar solo en la foto.');
          setStep('camera');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Agregar Acompañante" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">

          {/* Step 0: Loading - verificando sesión */}
          {step === 'loading' && (
            <Card className="p-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Verificando sesión...</h3>
              <p className="text-gray-600">
                Un momento por favor
              </p>
            </Card>
          )}

          {/* Step 1: Verificar usuario principal */}
          {step === 'verificar-principal' && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Verificar identidad</CardTitle>
                    <CardDescription>
                      Ingresa tu número de empleado para continuar
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerificarPrincipal} className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    <p className="font-semibold mb-2">ℹ️ Antes de continuar:</p>
                    <ul className="space-y-1 text-sm">
                      <li>• Debes estar registrado en el sistema</li>
                      <li>• Solo puedes tener UN acompañante</li>
                      <li>• Los puntos del acompañante sumarán a tu cuenta</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="numeroPrincipal">
                      Tu número de empleado <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="numeroPrincipal"
                      placeholder="EMP001 o ABC123"
                      value={numeroPrincipal}
                      onChange={(e) => setNumeroPrincipal(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={verificandoPrincipal}
                    >
                      {verificandoPrincipal ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        'Verificar →'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Formulario del acompañante */}
          {step === 'form' && (
            <Card>
              <CardHeader>
                <CardTitle>Datos del acompañante</CardTitle>
                <CardDescription>
                  Los puntos que gane {acompananteData.nombre || 'tu acompañante'} sumarán a la cuenta de {nombrePrincipal}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mensaje de usuario autenticado */}
                {SessionManager.isActive() && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-900">
                    <p className="font-semibold mb-1">✅ Sesión activa como {nombrePrincipal}</p>
                    <p className="text-xs text-green-700">
                      El acompañante se vinculará automáticamente a tu cuenta
                    </p>
                  </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="nombre">
                      Nombre completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      placeholder="María García"
                      value={acompananteData.nombre}
                      onChange={(e) => setAcompananteData({ ...acompananteData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="maria@ejemplo.com"
                      value={acompananteData.email}
                      onChange={(e) => setAcompananteData({ ...acompananteData, email: e.target.value })}
                    />
                  </div>

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                    >
                      Continuar →
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Captura de cámara */}
          {step === 'camera' && (
            <div className="space-y-4">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-purple-900">
                    <strong>Hola {acompananteData.nombre}!</strong> Captura tu selfie para
                    completar el registro como acompañante de {nombrePrincipal}.
                  </p>
                </CardContent>
              </Card>

              {loading ? (
                <Card className="p-12 text-center">
                  <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Registrando...</h3>
                  <p className="text-gray-600">
                    Estamos procesando la foto y creando el perfil
                  </p>
                </Card>
              ) : (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  buttonText="Capturar selfie"
                />
              )}

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setStep('form')}
                  disabled={loading}
                >
                  ← Volver
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Éxito */}
          {step === 'success' && (
            <Card className="text-center">
              <CardContent className="pt-12 pb-12 space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-green-600">
                    ¡Acompañante registrado!
                  </h2>
                  <p className="text-gray-600">
                    {acompananteData.nombre} ha sido registrado como acompañante de {nombrePrincipal}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left space-y-2">
                  <h3 className="font-semibold text-green-900">✅ Información importante:</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• {acompananteData.nombre} puede participar en concursos de forma independiente</li>
                    <li>• Los puntos ganados sumarán automáticamente a la cuenta de {nombrePrincipal}</li>
                    <li>• Ambos pueden consultar el balance en "Mi Perfil"</li>
                    <li>• El reconocimiento facial funcionará para ambos usuarios</li>
                  </ul>
                </div>

                <div className="flex flex-col space-y-3">
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full"
                    size="lg"
                  >
                    Ir al inicio
                  </Button>

                  <Button
                    onClick={() => navigate('/mi-perfil')}
                    variant="outline"
                    className="w-full"
                  >
                    Ver mi perfil
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

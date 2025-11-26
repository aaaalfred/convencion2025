import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { SessionManager } from '@/lib/session';
import { apiUrl } from '@/lib/api-config';

export default function Registro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl');
  const [step, setStep] = useState<'form' | 'camera' | 'acompanante-form' | 'acompanante-camera' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [validandoNumero, setValidandoNumero] = useState(false);
  const [numeroValido, setNumeroValido] = useState<boolean | null>(null);
  const [datosEmpleado, setDatosEmpleado] = useState<{ sucursal: string; puesto: string } | null>(null);
  const [registrarAcompanante, setRegistrarAcompanante] = useState(false);
  const [aceptoPrivacidad, setAceptoPrivacidad] = useState(false);

  // Datos del formulario principal
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    numeroEmpleado: ''
  });

  // Datos del acompañante
  const [acompananteData, setAcompananteData] = useState({
    nombre: '',
    email: '',
    numeroEmpleado: ''
  });


  // Validar número de empleado en tiempo real
  useEffect(() => {
    const validarNumero = async () => {
      if (!formData.numeroEmpleado || formData.numeroEmpleado.length < 3) {
        setNumeroValido(null);
        setDatosEmpleado(null);
        return;
      }

      setValidandoNumero(true);

      try {
        const response = await fetch(apiUrl(`/api/numeros-empleado/validar/${formData.numeroEmpleado}`));
        const data = await response.json();

        if (data.success && data.valido) {
          setNumeroValido(true);
          setDatosEmpleado(data.data);
        } else {
          setNumeroValido(false);
          setDatosEmpleado(null);
        }
      } catch (error) {
        console.error('Error validando número:', error);
        setNumeroValido(false);
        setDatosEmpleado(null);
      } finally {
        setValidandoNumero(false);
      }
    };

    const timer = setTimeout(validarNumero, 500);
    return () => clearTimeout(timer);
  }, [formData.numeroEmpleado]);


  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    if (!formData.numeroEmpleado.trim()) {
      toast.error('Por favor ingresa tu número de empleado');
      return;
    }

    if (numeroValido !== true) {
      toast.error('El número de empleado no es válido');
      return;
    }

    if (!aceptoPrivacidad) {
      toast.error('Debes aceptar el Aviso de Privacidad para continuar');
      return;
    }

    // Pasar al step de captura de cámara
    setStep('camera');
  };

  const handleCameraCapture = async (imageBase64: string) => {
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/api/usuarios/registro'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email || null,
          numeroEmpleado: formData.numeroEmpleado,
          foto: imageBase64
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar usuario');
      }

      if (data.success) {
        // Guardar sesión de 24 horas
        SessionManager.save({
          sessionToken: data.data.sessionToken,
          usuarioId: data.data.usuarioId,
          nombre: data.data.nombre,
          email: data.data.email,
          expiresAt: data.data.expiresAt
        });

        console.log('✅ Sesión guardada para usuario:', data.data.nombre);

        setUsuarioId(data.data.usuarioId);

        // Si seleccionó registrar acompañante, ir al formulario del acompañante
        if (registrarAcompanante) {
          setStep('acompanante-form');
          toast.success('¡Registro exitoso! Ahora registra a tu acompañante');
        } else {
          setStep('success');
          toast.success('¡Registro exitoso! Sesión activa por 24 horas');
        }
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error en registro:', error);

      if (error instanceof Error) {
        if (error.message.includes('ya está registrado')) {
          toast.error('Este número de empleado ya está registrado');
        } else if (error.message.includes('No se detectó ningún rostro')) {
          toast.error('No se detectó ningún rostro en la foto. Por favor intenta de nuevo.');
          setStep('camera');
        } else if (error.message.includes('múltiples rostros')) {
          toast.error('Se detectaron múltiples rostros. Por favor asegúrate de estar solo en la foto.');
          setStep('camera');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Error al conectar con el servidor. Verifica que el backend esté corriendo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcompananteFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!acompananteData.nombre.trim()) {
      toast.error('Por favor ingresa el nombre del acompañante');
      return;
    }


    // Pasar al step de captura de cámara del acompañante
    setStep('acompanante-camera');
  };

  const handleAcompananteCameraCapture = async (imageBase64: string) => {
    if (!usuarioId) {
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
          usuarioPrincipalId: usuarioId
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
          setStep('acompanante-camera');
        } else if (error.message.includes('múltiples rostros')) {
          toast.error('Se detectaron múltiples rostros. Por favor asegúrate de estar solo en la foto.');
          setStep('acompanante-camera');
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

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSkipAcompanante = () => {
    setStep('success');
    toast.info('Podrás agregar un acompañante después desde tu perfil');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Registro" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">

          {/* Step 1: Formulario principal */}
          {step === 'form' && (
            <Card>
              <CardHeader>
                <CardTitle>Crear cuenta</CardTitle>
                <CardDescription>
                  Completa tus datos para comenzar a participar en concursos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="numeroEmpleado">
                      Número de empleado <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="numeroEmpleado"
                        placeholder="EMP001 o ABC123"
                        value={formData.numeroEmpleado}
                        onChange={(e) => setFormData({ ...formData, numeroEmpleado: e.target.value })}
                        required
                        className={
                          numeroValido === true ? 'border-green-500' :
                          numeroValido === false ? 'border-red-500' : ''
                        }
                      />
                      {validandoNumero && (
                        <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-gray-400" />
                      )}
                      {!validandoNumero && numeroValido === true && (
                        <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                      )}
                      {!validandoNumero && numeroValido === false && (
                        <XCircle className="absolute right-3 top-3 w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {numeroValido === true && datosEmpleado && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
                        <p><strong>Sucursal:</strong> {datosEmpleado.sucursal}</p>
                        <p><strong>Puesto:</strong> {datosEmpleado.puesto}</p>
                      </div>
                    )}
                    {numeroValido === false && (
                      <p className="text-sm text-red-500">Número de empleado no válido</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nombre">
                      Nombre completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombre"
                      placeholder="Juan Pérez"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@ejemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono (opcional)</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      placeholder="123-456-7890"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>

                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="registrarAcompanante"
                      checked={registrarAcompanante}
                      onCheckedChange={(checked) => setRegistrarAcompanante(checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="registrarAcompanante"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        ¿Deseas registrar a un acompañante?
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Los puntos que gane tu acompañante sumarán a tu cuenta
                      </p>
                    </div>
                  </div>


                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="aceptoPrivacidad"
                      checked={aceptoPrivacidad}
                      onCheckedChange={(checked) => setAceptoPrivacidad(checked === true)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label
                        htmlFor="aceptoPrivacidad"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Acepto el <a href="/aviso-privacidad" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Aviso de Privacidad</a> <span className="text-red-500">*</span>
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        He leído y acepto el tratamiento de mis datos personales y biométricos
                      </p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={numeroValido !== true || !aceptoPrivacidad}
                    >
                      Continuar →
                    </Button>
                  </div>

                  <p className="text-xs text-gray-500 text-center">
                    Al continuar, aceptas que capturemos tu foto para validación facial
                  </p>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Captura de cámara principal */}
          {step === 'camera' && (
            <div className="space-y-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-blue-900">
                    <strong>Hola {formData.nombre}!</strong> Ahora captura tu selfie para
                    completar el registro. Esta foto se usará para validarte en futuros concursos.
                  </p>
                </CardContent>
              </Card>

              {loading ? (
                <Card className="p-12 text-center">
                  <Loader2 className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Registrando...</h3>
                  <p className="text-gray-600">
                    Estamos procesando tu foto y creando tu perfil
                  </p>
                </Card>
              ) : (
                <CameraCapture
                  onCapture={handleCameraCapture}
                  buttonText="Capturar mi selfie"
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

          {/* Step 3: Formulario del acompañante */}
          {step === 'acompanante-form' && (
            <Card>
              <CardHeader>
                <CardTitle>Registrar acompañante</CardTitle>
                <CardDescription>
                  Completa los datos de tu acompañante. Los puntos que gane sumarán a tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAcompananteFormSubmit} className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="nombreAcomp">
                      Nombre completo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="nombreAcomp"
                      placeholder="María García"
                      value={acompananteData.nombre}
                      onChange={(e) => setAcompananteData({ ...acompananteData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailAcomp">Email (opcional)</Label>
                    <Input
                      id="emailAcomp"
                      type="email"
                      placeholder="maria@ejemplo.com"
                      value={acompananteData.email}
                      onChange={(e) => setAcompananteData({ ...acompananteData, email: e.target.value })}
                    />
                  </div>

                  <div className="pt-4 space-y-3">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      
                    >
                      Continuar →
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleSkipAcompanante}
                    >
                      Registrar después
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Captura de cámara del acompañante */}
          {step === 'acompanante-camera' && (
            <div className="space-y-4">
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-purple-900">
                    <strong>Hola {acompananteData.nombre}!</strong> Ahora captura tu selfie para
                    completar el registro como acompañante de {formData.nombre}.
                  </p>
                </CardContent>
              </Card>

              {loading ? (
                <Card className="p-12 text-center">
                  <Loader2 className="w-16 h-16 animate-spin text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Registrando acompañante...</h3>
                  <p className="text-gray-600">
                    Estamos procesando la foto y creando el perfil del acompañante
                  </p>
                </Card>
              ) : (
                <CameraCapture
                  onCapture={handleAcompananteCameraCapture}
                  buttonText="Capturar selfie del acompañante"
                />
              )}

              <div className="text-center space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep('acompanante-form')}
                  disabled={loading}
                >
                  ← Volver
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSkipAcompanante}
                  disabled={loading}
                >
                  Omitir
                </Button>
              </div>
            </div>
          )}

          {/* Step final: Éxito */}
          {step === 'success' && (
            <Card className="text-center">
              <CardContent className="pt-12 pb-12 space-y-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-green-600">
                    ¡Bienvenido {formData.nombre}!
                  </h2>
                  <p className="text-gray-600">
                    Tu registro ha sido completado exitosamente
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left space-y-2">
                  <h3 className="font-semibold text-green-900">✅ Lo que sigue:</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Ya puedes participar en concursos escaneando códigos QR</li>
                    <li>• No necesitas login, tu rostro es tu identificación</li>
                    <li>• Acumula puntos en cada concurso</li>
                    <li>• Consulta tu balance en "Mi Perfil"</li>
                    {registrarAcompanante && (
                      <li>• Los puntos de tu acompañante sumarán a tu cuenta automáticamente</li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-col space-y-3">
                  {returnUrl ? (
                    <Button
                      onClick={() => navigate(returnUrl)}
                      className="w-full bg-gradient-to-r from-primary to-orange-500"
                      size="lg"
                    >
                      Continuar a la Trivia
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={handleGoHome}
                        className="w-full"
                        size="lg"
                      >
                        Ir al inicio
                      </Button>

                      <Button
                        onClick={() => navigate('/concurso/NAV2024')}
                        variant="outline"
                        className="w-full"
                      >
                        Participar en un concurso de prueba
                      </Button>
                    </>
                  )}
                </div>

                {usuarioId && (
                  <p className="text-xs text-gray-500">
                    Usuario ID: {usuarioId}
                  </p>
                )}
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

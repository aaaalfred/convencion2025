import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/shared/Header';
import { Footer } from '@/components/shared/Footer';
import { CameraCapture } from '@/components/shared/CameraCapture';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { SessionManager } from '@/lib/session';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function Registro() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'form' | 'camera' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [usuarioId, setUsuarioId] = useState<number | null>(null);

  // Datos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      toast.error('Por favor ingresa tu nombre');
      return;
    }

    // Pasar al step de captura de cámara
    setStep('camera');
  };

  const handleCameraCapture = async (imageBase64: string) => {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/usuarios/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          email: formData.email || null,
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
        setStep('success');
        toast.success('¡Registro exitoso! Sesión activa por 24 horas');
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error en registro:', error);

      if (error instanceof Error) {
        if (error.message.includes('ya está registrado')) {
          toast.error('Este rostro ya está registrado. Intenta con "Mi Perfil" para identificarte.');
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

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header showBackButton title="Registro" />

      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">

          {/* Step 1: Formulario */}
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

                  <div className="pt-4">
                    <Button type="submit" className="w-full" size="lg">
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

          {/* Step 2: Captura de cámara */}
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

          {/* Step 3: Éxito */}
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
                  </ul>
                </div>

                <div className="flex flex-col space-y-3">
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

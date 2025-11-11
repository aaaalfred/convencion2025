import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, UserX, Trophy } from 'lucide-react';

export type ResultadoTipo = 'exito' | 'ya-participaste' | 'no-registrado' | 'error';

export interface ResultadoData {
  tipo: ResultadoTipo;
  mensaje: string;
  usuario?: {
    nombre: string;
    totalPuntos: number;
  };
  puntosGanados?: number;
  participacion?: {
    fecha: string;
    puntosGanados: number;
  };
}

interface ResultadoModalProps {
  resultado: ResultadoData;
  onClose?: () => void;
}

export function ResultadoModal({ resultado, onClose }: ResultadoModalProps) {
  const navigate = useNavigate();

  const handleVerPerfil = () => {
    navigate('/mi-perfil');
  };

  const handleIrInicio = () => {
    navigate('/');
  };

  const handleRegistrarse = () => {
    navigate('/registro');
  };

  // Variante: ÉXITO
  if (resultado.tipo === 'exito') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <Trophy className="w-16 h-16 text-green-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-green-600">
              ¡Felicitaciones!
            </h2>
            <p className="text-lg text-gray-700">
              {resultado.mensaje || `¡Hola ${resultado.usuario?.nombre}! Ganaste ${resultado.puntosGanados} puntos`}
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
            <div className="text-sm text-green-700 mb-2">Balance total</div>
            <div className="text-5xl font-bold text-green-600">
              {resultado.usuario?.totalPuntos || 0}
            </div>
            <div className="text-sm text-green-700 mt-1">puntos acumulados</div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleVerPerfil}
              className="w-full bg-gradient-to-r from-green-500 to-green-600"
              size="lg"
            >
              Ver mi perfil completo
            </Button>

            <Button
              onClick={handleIrInicio}
              variant="outline"
              className="w-full"
            >
              Ir al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante: YA PARTICIPASTE
  if (resultado.tipo === 'ya-participaste') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-12 h-12 text-blue-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-blue-600">
              Ya participaste
            </h2>
            <p className="text-gray-700">
              Hola <strong>{resultado.usuario?.nombre}</strong>, ya participaste en este concurso
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">Fecha de participación:</span>
              <span className="font-semibold text-blue-900">
                {resultado.participacion?.fecha || '05/11/2024'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-800">Puntos ganados:</span>
              <span className="font-semibold text-blue-900">
                {resultado.participacion?.puntosGanados || 100} pts
              </span>
            </div>
            <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
              <span className="text-sm text-blue-800">Balance total:</span>
              <span className="text-2xl font-bold text-blue-900">
                {resultado.usuario?.totalPuntos || 0} pts
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Solo puedes participar una vez por concurso. Busca otros concursos para seguir acumulando puntos.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleVerPerfil}
              className="w-full"
            >
              Ver mi perfil
            </Button>

            <Button
              onClick={handleIrInicio}
              variant="outline"
              className="w-full"
            >
              Ver otros concursos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante: NO REGISTRADO
  if (resultado.tipo === 'no-registrado') {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-12 pb-12 text-center space-y-6">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <UserX className="w-12 h-12 text-orange-600" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-orange-600">
              No te reconocemos
            </h2>
            <p className="text-gray-700">
              {resultado.mensaje || 'No encontramos tu rostro en nuestro sistema'}
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-orange-900 mb-2">
              ¿Es tu primera vez?
            </h3>
            <p className="text-sm text-orange-800 mb-3">
              Para participar en concursos necesitas registrarte primero. El proceso es rápido:
            </p>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>✓ Ingresa tu nombre</li>
              <li>✓ Captura tu selfie</li>
              <li>✓ ¡Listo para participar!</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleRegistrarse}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
              size="lg"
            >
              Registrarme ahora
            </Button>

            <Button
              onClick={handleIrInicio}
              variant="outline"
              className="w-full"
            >
              Ir al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Variante: ERROR
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="pt-12 pb-12 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-red-600">
            Algo salió mal
          </h2>
          <p className="text-gray-700">
            {resultado.mensaje || 'Ocurrió un error al procesar tu solicitud'}
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            Por favor intenta de nuevo. Si el problema persiste, contacta a soporte.
          </p>
        </div>

        <div className="space-y-3">
          {onClose && (
            <Button
              onClick={onClose}
              className="w-full"
            >
              Intentar de nuevo
            </Button>
          )}

          <Button
            onClick={handleIrInicio}
            variant="outline"
            className="w-full"
          >
            Ir al inicio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

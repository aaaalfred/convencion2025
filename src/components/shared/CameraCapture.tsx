import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, RotateCcw, Check, AlertCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void;
  buttonText?: string;
  showPreview?: boolean;
}

export function CameraCapture({
  onCapture,
  buttonText = "Capturar Selfie",
  showPreview = true
}: CameraCaptureProps) {
  const [captured, setCaptured] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Limpiar stream cuando el componente se desmonta
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);


  // Iniciar la cámara
  const startCamera = async () => {
    try {
      console.log('🎥 Iniciando cámara...');
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      console.log('✅ Stream obtenido:', stream);
      console.log('📹 Video tracks:', stream.getVideoTracks());

      if (videoRef.current) {
        console.log('📺 Asignando stream al video element...');
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        // Esperar a que el video esté listo para reproducirse
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata cargada');
          videoRef.current?.play().then(() => {
            console.log('▶️ Video reproduciendo');
            setCameraActive(true);
          }).catch((playErr) => {
            console.error('❌ Error al reproducir video:', playErr);
            setError('Error al iniciar el video. Intenta de nuevo.');
          });
        };
      } else {
        console.error('❌ videoRef.current es null');
        setError('Error: elemento de video no disponible');
      }
    } catch (err) {
      console.error('❌ Error al acceder a la cámara:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permiso de cámara denegado. Por favor permite el acceso a la cámara.');
        } else if (err.name === 'NotFoundError') {
          setError('No se encontró ninguna cámara en tu dispositivo.');
        } else {
          setError(`Error al acceder a la cámara: ${err.message}`);
        }
      }
    }
  };

  // Detener la cámara
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Capturar foto desde el video
  const handleCapture = () => {
    console.log('📸 Capturando foto...');
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Referencias no disponibles');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('❌ No se pudo obtener contexto 2d del canvas');
      return;
    }

    // Configurar tamaño del canvas igual al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(`📐 Dimensiones: ${canvas.width}x${canvas.height}`);

    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir canvas a base64 JPEG
    const base64Image = canvas.toDataURL('image/jpeg', 0.95);

    console.log('✅ Imagen capturada, tamaño:', Math.round(base64Image.length / 1024), 'KB');

    // Guardar la imagen
    setImageUrl(base64Image);
    setCapturedBase64(base64Image);
    setCaptured(true);

    // Detener la cámara
    stopCamera();
  };

  const handleRetake = () => {
    setCaptured(false);
    setImageUrl(null);
    setCapturedBase64(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedBase64) {
      onCapture(capturedBase64);
    }
  };

  if (!captured) {
    return (
      <Card className="p-8 text-center space-y-4">
        <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
          {/* Placeholder cuando la cámara no está activa */}
          {!cameraActive && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-primary/20 animate-pulse"></div>
              <Camera className="w-24 h-24 text-gray-400 z-10" />
            </div>
          )}

          {/* Video element - SIEMPRE renderizado pero oculto cuando no está activo */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {/* Error display */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 p-4 bg-white/90">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          {/* Canvas oculto para capturar la foto */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Captura tu selfie</h3>
          <p className="text-sm text-gray-600">
            Asegúrate de estar en un lugar bien iluminado y mira directamente a la cámara
          </p>
        </div>

        {!cameraActive && !error && (
          <Button
            onClick={startCamera}
            className="w-full bg-gradient-to-r from-primary to-orange-500"
            size="lg"
          >
            <Camera className="mr-2 h-5 w-5" />
            Activar Cámara
          </Button>
        )}

        {cameraActive && (
          <Button
            onClick={handleCapture}
            className="w-full bg-gradient-to-r from-primary to-orange-500"
            size="lg"
          >
            <Camera className="mr-2 h-5 w-5" />
            {buttonText}
          </Button>
        )}

        {error && (
          <Button
            onClick={startCamera}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Reintentar
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-8 text-center space-y-4">
      {showPreview && imageUrl && (
        <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
          <img
            src={imageUrl}
            alt="Selfie capturada"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2 text-green-600">
          <Check className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Foto capturada</h3>
        </div>
        <p className="text-sm text-gray-600">
          ¿La foto se ve bien?
        </p>
      </div>

      <div className="flex space-x-3">
        <Button
          onClick={handleRetake}
          variant="outline"
          className="flex-1"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Tomar otra
        </Button>

        <Button
          onClick={handleConfirm}
          className="flex-1 bg-gradient-to-r from-green-500 to-green-600"
        >
          <Check className="mr-2 h-4 w-4" />
          Confirmar
        </Button>
      </div>
    </Card>
  );
}

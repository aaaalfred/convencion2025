/**
 * Configuración de la API
 *
 * En producción (Amplify), el frontend y backend están en el mismo dominio,
 * por lo que usamos rutas relativas.
 *
 * En desarrollo, usamos la URL del servidor local.
 */

// Detectar si estamos en producción
const isProduction = import.meta.env.PROD;

// Obtener URL de la API
const getApiUrl = (): string => {
  // Si hay una variable de entorno explícita, usarla
  const envApiUrl = import.meta.env.VITE_API_URL;

  if (envApiUrl !== undefined && envApiUrl !== '') {
    // Remover trailing slash si existe
    return envApiUrl.replace(/\/$/, '');
  }

  // En producción (Amplify), usar ruta relativa
  if (isProduction) {
    return ''; // Ruta relativa - mismo dominio
  }

  // En desarrollo, usar localhost
  return 'http://localhost:3002'; // Puerto del servidor backend
};

export const API_URL = getApiUrl();

// Helper para construir URLs de API
export const apiUrl = (path: string): string => {
  // Asegurar que el path comience con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Si API_URL está vacío (producción), solo devolver el path
  if (API_URL === '') {
    return normalizedPath;
  }

  // Concatenar URL base con path
  return `${API_URL}${normalizedPath}`;
};

// Log para debugging (solo en desarrollo)
if (!isProduction) {
  console.log('🔧 API Configuration:');
  console.log('  Environment:', import.meta.env.MODE);
  console.log('  Production:', isProduction);
  console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  API_URL:', API_URL);
  console.log('  Example:', apiUrl('/api/ranking'));
}

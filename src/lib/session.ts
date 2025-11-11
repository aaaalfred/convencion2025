/**
 * SessionManager - Gestión de sesiones de usuario con expiración de 24 horas
 *
 * Permite almacenar sesiones en localStorage para evitar selfies repetitivos
 * en consultas de perfil, manteniendo validación facial solo en acciones críticas.
 */

interface SessionData {
  sessionToken: string;
  usuarioId: number;
  nombre: string;
  email: string | null;
  expiresAt: string;
}

const SESSION_KEY = 'userSession';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

export const SessionManager = {
  /**
   * Guardar sesión después de registro o login
   */
  save: (data: SessionData): void => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      console.log('🔐 Sesión guardada:', {
        usuarioId: data.usuarioId,
        nombre: data.nombre,
        expiresAt: data.expiresAt
      });
    } catch (error) {
      console.error('Error al guardar sesión:', error);
    }
  },

  /**
   * Obtener sesión actual (valida expiración automáticamente)
   */
  get: (): SessionData | null => {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      if (!data) {
        return null;
      }

      const session: SessionData = JSON.parse(data);

      // Verificar si expiró
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      if (expiresAt < now) {
        console.log('⏰ Sesión expirada, limpiando...');
        SessionManager.clear();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error al leer sesión:', error);
      SessionManager.clear();
      return null;
    }
  },

  /**
   * Verificar si hay sesión activa
   */
  isActive: (): boolean => {
    return SessionManager.get() !== null;
  },

  /**
   * Cerrar sesión (eliminar datos)
   */
  clear: (): void => {
    try {
      localStorage.removeItem(SESSION_KEY);
      console.log('🚪 Sesión cerrada');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  },

  /**
   * Renovar sesión (extiende por 24h más desde ahora)
   * Útil al participar en concursos exitosamente
   */
  renew: (): void => {
    const session = SessionManager.get();
    if (session) {
      const newExpiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();
      session.expiresAt = newExpiresAt;
      SessionManager.save(session);
      console.log('🔄 Sesión renovada hasta:', newExpiresAt);
    }
  },

  /**
   * Crear nuevo token de sesión (para uso interno)
   */
  generateToken: (): string => {
    // Generar un UUID v4 simple
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Crear datos de sesión completos
   */
  create: (usuarioId: number, nombre: string, email: string | null, sessionToken?: string): SessionData => {
    return {
      sessionToken: sessionToken || SessionManager.generateToken(),
      usuarioId,
      nombre,
      email,
      expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString()
    };
  },

  /**
   * Obtener información de tiempo restante
   */
  getTimeRemaining: (): string | null => {
    const session = SessionManager.get();
    if (!session) return null;

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const diff = expiresAt.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }
};

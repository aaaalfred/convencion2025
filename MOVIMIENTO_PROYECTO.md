# Movimiento de Proyecto

## Cambio de Ubicación

### Ubicación Anterior
```
\\wsl.localhost\Ubuntu\home\imalf\code\hdzexpo\concursos
```

### Nueva Ubicación
```
\\wsl.localhost\Ubuntu\home\imalf\code\expo2025
```

---

## Archivos Movidos

Todos los archivos del proyecto fueron copiados exitosamente:

- ✓ Código fuente (`src/`)
- ✓ Scripts de configuración (`scripts/`)
- ✓ Archivos de configuración (package.json, vite.config.ts, etc.)
- ✓ Documentación (README.md, QUICK_START.md, CHECKLIST_PRODUCCION.md)
- ✓ Variables de entorno (.env, .env.example)

---

## Próximos Pasos

### 1. Reinstalar Dependencias

Desde tu terminal de WSL Ubuntu, ejecuta:

```bash
cd ~/code/expo2025
rm -rf node_modules package-lock.json
npm install
```

**Nota**: Esto instalará todas las dependencias limpias desde cero.

### 2. Verificar que Funciona

```bash
npm run dev
```

Debería abrir el proyecto en: http://localhost:8081

---

## Nota Técnica

El proyecto fue copiado sin `node_modules` para evitar problemas con symlinks. Las dependencias deben reinstalarse desde la terminal nativa de Ubuntu en WSL.

---

Fecha: 10 de Noviembre 2024

# Obras BMS

App móvil (PWA) para el día a día de integración BMS: fichas de obra, notas de visita, checklist de puesta en marcha y listado de equipos (IP, protocolo, slave ID…).

- Funciona sin conexión una vez abierta.
- Los datos se guardan **solo en el móvil** (localStorage). Haz copias desde el menú ⋮ → *Exportar copia de seguridad*.
- Sin servidor, sin cuentas, sin dependencias: HTML + CSS + JS.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub (p. ej. `obras-bms`) y sube todos estos archivos a la raíz.
2. En el repo: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)` → *Save*.
3. En 1–2 minutos estará en `https://TU-USUARIO.github.io/obras-bms/`.

## Instalar en el móvil

- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación* / *Añadir a pantalla de inicio*.
- **iPhone (Safari):** abre la URL → botón Compartir → *Añadir a pantalla de inicio*.

## Actualizar la app

Tras modificar archivos, cambia la versión en `sw.js` (`obras-bms-v1` → `obras-bms-v2`) y haz commit. El móvil cogerá la nueva versión al abrirla con conexión.

## Personalizar

En `app.js`, al principio:
- `TEMPLATE`: checklist por defecto de cada obra nueva.
- `SYSTEMS`, `PROTOCOLS`, `STATUSES`: listas desplegables.

> Nota: si el repo es público, el **código** es visible, pero tus datos no: nunca salen del móvil.

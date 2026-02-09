# 📱 HSB APP - PWA INSTALADA ✅

## 🎉 FELICIDADES - PWA IMPLEMENTADA

Tu aplicación ahora es una **Progressive Web App** y puede:
- ✅ Instalarse en teléfonos Android e iOS
- ✅ Tener icono propio en el home screen
- ✅ Abrir como app (sin navegador visible)
- ✅ Funcionar offline (lectura de datos)
- ✅ Actualizarse automáticamente

---

## 📦 ARCHIVOS INCLUIDOS

```
📁 Tu carpeta debe tener:
├── hsb-app.html              ← Tu aplicación principal
├── manifest.json             ← Configuración de la PWA
├── service-worker.js         ← Código para funcionar offline
├── generar-iconos.html       ← Generador de íconos
└── 📁 icons/                 ← Carpeta que crearás
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

---

## 🚀 INSTALACIÓN - PASO A PASO

### **PASO 1: GENERAR ÍCONOS (5 minutos)**

1. Abre el archivo `generar-iconos.html` en tu navegador
2. Click en "🎨 Generar Todos los Íconos"
3. Verás 8 íconos de diferentes tamaños
4. Descarga cada uno:
   - Click derecho → "Guardar imagen como..."
   - O usa el botón "📥 Descargar" de cada ícono
5. Guárdalos con estos nombres exactos:
   - icon-72.png
   - icon-96.png
   - icon-128.png
   - icon-144.png
   - icon-152.png
   - icon-192.png
   - icon-384.png
   - icon-512.png

---

### **PASO 2: ORGANIZAR ARCHIVOS**

Crea esta estructura de carpetas:

```
📁 hsb-app/
├── hsb-app.html
├── manifest.json
├── service-worker.js
└── 📁 icons/
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-128.png
    ├── icon-144.png
    ├── icon-152.png
    ├── icon-192.png
    ├── icon-384.png
    └── icon-512.png
```

**IMPORTANTE:** Los 3 archivos principales (hsb-app.html, manifest.json, service-worker.js) deben estar en la MISMA carpeta.

---

### **PASO 3: SUBIR A SERVIDOR WEB**

Tienes varias opciones:

#### **OPCIÓN A: Firebase Hosting (GRATIS - Recomendado)**

```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Inicializar proyecto
firebase init hosting

# 4. Copiar archivos a la carpeta 'public'

# 5. Desplegar
firebase deploy
```

#### **OPCIÓN B: GitHub Pages (GRATIS)**

1. Crear repositorio en GitHub
2. Subir todos los archivos
3. Ir a Settings → Pages
4. Activar GitHub Pages
5. Tu app estará en: `https://tu-usuario.github.io/hsb-app`

#### **OPCIÓN C: Netlify (GRATIS)**

1. Ir a https://www.netlify.com
2. Arrastrar la carpeta completa
3. Listo - te dan una URL

#### **OPCIÓN D: Tu propio servidor**

- Sube todos los archivos vía FTP
- Asegúrate que el servidor soporte HTTPS (obligatorio para PWA)

---

### **PASO 4: PROBAR EN TELÉFONO**

#### **EN ANDROID (Chrome):**

1. Abre Chrome en tu teléfono
2. Ve a la URL donde subiste la app
3. Espera 3-5 segundos
4. Aparecerá popup: **"Agregar HSB App a pantalla de inicio"**
5. Click en "Agregar"
6. ✅ Listo - ícono aparece en el home screen

**Si no aparece el popup:**
- Menu (⋮) → "Agregar a pantalla de inicio"

#### **EN iOS (Safari):**

1. Abre Safari en tu iPhone/iPad
2. Ve a la URL donde subiste la app
3. Click en botón "Compartir" (cuadrado con flecha)
4. Scroll y busca "Agregar a pantalla de inicio"
5. Click → Agregar
6. ✅ Listo - ícono aparece en el home screen

---

## 🔄 ACTUALIZAR LA APP (CÓMO HACERLO)

### **Cuando hagas cambios:**

1. Edita `hsb-app.html` (haz tus cambios)

2. Edita `service-worker.js`:
   ```javascript
   // Línea 3 - CAMBIAR la versión:
   const CACHE_VERSION = 'hsb-app-v1.0.1';  // ← Incrementa esto
   
   // Línea 6 - Tipo de actualización:
   const UPDATE_TYPE = 'minor';  // minor, major, o critical
   ```

3. Sube ambos archivos al servidor

4. **Los usuarios se actualizarán automáticamente:**
   - `minor` → Silencioso (próxima vez que abran)
   - `major` → Aparece notificación "Actualizar disponible"
   - `critical` → Fuerza actualización inmediata

---

## 🎯 TIPOS DE ACTUALIZACIÓN

### **MINOR (Cambios pequeños)**
```javascript
const CACHE_VERSION = 'hsb-app-v1.0.1';
const UPDATE_TYPE = 'minor';
```
- Correcciones de texto
- Cambios de color
- Mejoras pequeñas
- **Actualiza:** Silenciosamente en próxima apertura

---

### **MAJOR (Cambios importantes)**
```javascript
const CACHE_VERSION = 'hsb-app-v1.1.0';
const UPDATE_TYPE = 'major';
```
- Nuevas funcionalidades
- Cambios visuales grandes
- **Actualiza:** Muestra notificación con opción de actualizar ahora o después

---

### **CRITICAL (Bugs urgentes)**
```javascript
const CACHE_VERSION = 'hsb-app-v1.0.2';
const UPDATE_TYPE = 'critical';
```
- Bugs críticos
- Errores de seguridad
- Problemas graves
- **Actualiza:** Fuerza recarga inmediata

---

## 🧪 CÓMO PROBAR LOCALMENTE

### **OPCIÓN 1: Python (Más fácil)**

```bash
# Python 3
cd carpeta-con-los-archivos
python -m http.server 8000

# Abre en navegador:
# http://localhost:8000/hsb-app.html
```

### **OPCIÓN 2: Node.js**

```bash
# Instalar servidor simple
npm install -g http-server

# Ejecutar
cd carpeta-con-los-archivos
http-server

# Abre en navegador:
# http://localhost:8080/hsb-app.html
```

### **OPCIÓN 3: VS Code**

1. Instalar extensión "Live Server"
2. Click derecho en hsb-app.html → "Open with Live Server"

**IMPORTANTE:** La PWA solo funciona con HTTPS (excepto en localhost)

---

## 🔍 VERIFICAR QUE FUNCIONA

### **En Chrome Desktop:**

1. Abre hsb-app.html
2. Presiona F12 (DevTools)
3. Tab "Application"
4. Lado izquierdo → "Service Workers"
5. Debes ver: ✅ "hsb-app-v1.0.0 - activated and is running"

### **En Chrome Mobile:**

1. Abre la app instalada
2. Debería abrir SIN la barra del navegador
3. Modo "pantalla completa"

---

## 📊 ESTRUCTURA DEL CÓDIGO PWA

### **manifest.json**
```json
{
  "name": "HSB Mantenimiento Preventivo",
  "short_name": "HSB App",
  "start_url": "./hsb-app.html",
  "display": "standalone",  ← Abre sin navegador
  "theme_color": "#667eea",
  "icons": [...]
}
```

### **service-worker.js**
```javascript
const CACHE_VERSION = 'hsb-app-v1.0.0';  ← Versión
const UPDATE_TYPE = 'minor';             ← Tipo actualización
const CACHE_FILES = [                    ← Archivos a cachear
    './hsb-app.html',
    './manifest.json'
];
```

### **hsb-app.html**
```html
<!-- En el <head> -->
<link rel="manifest" href="./manifest.json">
<meta name="theme-color" content="#667eea">

<!-- Al final antes de </body> -->
<script>
  // Registro del Service Worker
  navigator.serviceWorker.register('./service-worker.js')
</script>
```

---

## ❓ PROBLEMAS COMUNES

### **"No aparece el popup de instalación"**

**Requisitos para que aparezca:**
- ✅ Debe estar en HTTPS (o localhost)
- ✅ manifest.json debe ser válido
- ✅ Service Worker debe registrarse correctamente
- ✅ Debe tener al menos 1 ícono de 192x192 y otro de 512x512
- ✅ Usuario debe visitar la app al menos 2 veces

**Solución:**
- Verifica en DevTools → Application → Manifest
- Verifica en DevTools → Application → Service Workers

---

### **"La app no se actualiza"**

**Verifica:**
1. ¿Cambiaste CACHE_VERSION en service-worker.js?
2. ¿Subiste service-worker.js actualizado?
3. ¿El navegador cacheó el service-worker.js viejo?

**Solución:**
- Borra cache del navegador
- O cambia el nombre del archivo a service-worker-v2.js

---

### **"Firebase no funciona offline"**

**Normal:**
- Offline solo puedes VER datos
- NO puedes GUARDAR sin internet
- Firebase necesita conexión para escribir

**Esto es correcto** - PWA solo cachea archivos estáticos (HTML, CSS, JS).
Los datos de Firebase siguen siendo en tiempo real.

---

## 🎉 ¡LISTO!

Tu aplicación ahora es una PWA completa que:
- ✅ Se instala en teléfonos
- ✅ Tiene icono propio
- ✅ Abre como app nativa
- ✅ Se actualiza automáticamente
- ✅ Funciona offline (lectura)
- ✅ Firebase en tiempo real (con internet)

---

## 🆘 SOPORTE

Si tienes problemas:
1. Revisa la consola (F12 → Console)
2. Verifica DevTools → Application → Service Workers
3. Asegúrate que todos los archivos están en la misma carpeta
4. Verifica que los íconos existan en /icons/

---

**¡Disfruta tu PWA!** 🚀

# Malla Pro

Aplicación web interactiva para gestionar y visualizar la malla curricular universitaria. Permite marcar ramos aprobados, en curso y excepcionales, registrar notas, ver el progreso académico y administrar el horario semanal.

---

## Índice

1. [Características](#características)
2. [Capturas de pantalla](#capturas-de-pantalla)
3. [Tecnologías](#tecnologías)
4. [Manual de levantamiento (desarrollo)](#manual-de-levantamiento-desarrollo)
5. [Despliegue en producción](#despliegue-en-producción)
   - [Vercel](#opción-a-vercel-recomendado)
   - [Netlify](#opción-b-netlify)
   - [Servidor propio / VPS](#opción-c-servidor-propio--vps)
   - [GitHub Pages](#opción-d-github-pages)
   - [Bluehost (cPanel)](#opción-e-bluehost-cpanel)
6. [Manual de usuario](#manual-de-usuario)
7. [Estructura del proyecto](#estructura-del-proyecto)
8. [Variables y configuración](#variables-y-configuración)
9. [Contribuir](#contribuir)

---

## Características

- **Malla curricular interactiva** — visualiza todos los semestres y ramos de tu carrera.
- **Estados de ramos** — marca ramos como *Aprobado*, *En curso* o *Excepcional*.
- **Registro de notas** — agrega evaluaciones con peso porcentual y calcula el promedio ponderado.
- **Resumen de progreso** — estadísticas de asignaturas y créditos SCT aprobados, en curso y pendientes.
- **Horario semanal** — crea y gestiona tu horario con bloques de 45 minutos, sala e importación desde ramos cursando.
- **Próxima clase** — widget que muestra en tiempo real la próxima clase según la hora del dispositivo.
- **Temas de color** — Aurora Blue, Sunset Pink, Emerald Mist, Midnight Purple y Golden Carbon.
- **Modo oscuro y claro** — totalmente integrado con los temas de color.
- **100% local** — todos los datos se guardan en el navegador (`localStorage`), sin servidor ni cuenta requerida.
- **Responsive** — diseñado mobile-first con barra de navegación inferior y drawers optimizados para celular.

---

## Tecnologías

| Paquete | Versión | Rol |
|---|---|---|
| React | 19 | UI |
| Vite | 7 | Bundler / dev server |
| Tailwind CSS | 3 | Estilos utilitarios |
| Framer Motion | 12 | Animaciones |
| Lucide React | 0.55 | Íconos |
| React Router DOM | 7 | Enrutamiento |

---

## Manual de levantamiento (desarrollo)

### Requisitos previos

- **Node.js** ≥ 18.x — [descargar](https://nodejs.org/)
- **npm** ≥ 9.x (incluido con Node.js)
- **Git**

### Clonar el repositorio

```bash
git clone https://github.com/lauritaggz/Malla-pro-UCH.git
cd Malla-pro-UCH
```

### Instalar dependencias

```bash
npm install
```

### Iniciar servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.  
Los cambios en los archivos se reflejan automáticamente (Hot Module Replacement).

### Otros comandos útiles

```bash
# Construir para producción
npm run build

# Previsualizar el build de producción localmente
npm run preview

# Ejecutar el linter
npm run lint
```

El build de producción se genera en la carpeta `dist/`.

---

## Despliegue en producción

### Opción A — Vercel (recomendado)

1. Crea una cuenta en [vercel.com](https://vercel.com) si no tienes una.
2. Haz clic en **Add New Project** e importa el repositorio desde GitHub.
3. Vercel detecta automáticamente que es un proyecto Vite. Deja la configuración por defecto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Haz clic en **Deploy**.

El archivo `vercel.json` ya incluido maneja el enrutamiento SPA y los headers de caché.

Para despliegues manuales desde la CLI:

```bash
npm install -g vercel
vercel --prod
```

---

### Opción B — Netlify

1. Crea una cuenta en [netlify.com](https://netlify.com).
2. En el dashboard, haz clic en **Add new site → Import an existing project**.
3. Conecta tu repositorio de GitHub y configura:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Haz clic en **Deploy site**.

El archivo `netlify.toml` y `public/_redirects` ya incluidos manejan el enrutamiento SPA.

Para despliegues manuales desde la CLI:

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

---

### Opción C — Servidor propio / VPS

Requisitos: servidor web con **Nginx** o **Apache**.

**1. Construir el proyecto:**

```bash
npm run build
```

**2. Copiar la carpeta `dist/` al servidor:**

```bash
scp -r dist/ usuario@tu-servidor:/var/www/malla-pro/
```

**3. Configurar Nginx** (`/etc/nginx/sites-available/malla-pro`):

```nginx
server {
    listen 80;
    server_name tudominio.com;
    root /var/www/malla-pro;
    index index.html;

    # Enrutamiento SPA — redirige todo a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Caché de assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/malla-pro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**4. (Opcional) HTTPS con Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

---

### Opción D — GitHub Pages

1. En `vite.config.js`, cambia `base: "/"` por `base: "/nombre-de-tu-repo/"`.
2. Instala el plugin de GitHub Pages:
   ```bash
   npm install --save-dev gh-pages
   ```
3. Agrega en `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```
4. Ejecuta:
   ```bash
   npm run deploy
   ```
5. En la configuración del repositorio en GitHub → **Pages**, selecciona la rama `gh-pages`.

---

### Opción E — Bluehost (cPanel)

Hosting compartido tipo Bluehost sirve la app como sitio **estático**: no necesitas Node.js en el servidor, solo subir el resultado del build.

#### 1. Generar el sitio en tu PC

```bash
npm install
npm run build
```

- La salida queda en la carpeta **`dist/`**.
- **`public/.htaccess`** se copia solo a `dist/` al construir: en Apache envía las rutas de la SPA (React Router) a `index.html` y deja intactos `assets/`, `mallas/*.json`, etc.

Opcional — **un solo zip para subir** (en Windows incluye `.htaccess`):

```bash
npm run pack:cpanel
```

Se crea **`mallapro-cpanel-upload.zip`** en la raíz del proyecto. En cPanel puedes subir ese archivo a la carpeta del dominio y usar **Extraer**.

#### 2. Subir a cPanel (Administrador de archivos o FTP)

1. Entra en la carpeta **raíz del dominio** (si `mallapro.cl` es dominio adicional, suele ser algo como `public_html/mallapro.cl`, como en tu hosting).
2. Activa **mostrar archivos ocultos** (punto inicial): sin **`.htaccess`**, al recargar rutas como `/app` Apache devolverá 404.
3. Sube **todo** el contenido de `dist/` (o extrae el zip ahí). Conviene **reemplazar** archivos viejos para no mezclar hashes de JS/CSS de builds anteriores.
4. Comprueba que existan al menos: `index.html`, `.htaccess`, carpeta `assets/`, carpeta `mallas/`.

#### 3. SSL y comprobación

En cPanel, activa **SSL** para el dominio (Let’s Encrypt u otro certificado gratuito del hosting).

Abre tu dominio en el navegador y prueba una ruta interna (por ejemplo una vista que no sea la home) recargando con F5: debe cargar la app, no un 404 del servidor.

#### Dominio en subcarpeta (no es el caso habitual de un dominio propio)

Si la URL fuera `tudominio.com/malla/` en lugar de la raíz del dominio:

1. En `vite.config.js`, pon `base: "/malla/"` (con barra final).
2. En `public/.htaccess`, ajusta `RewriteBase` a esa misma ruta (ver comentarios en el archivo).
3. Vuelve a ejecutar `npm run build` y sube de nuevo `dist/`.

#### Favicon

Si usas **`favicon.png`**, colócalo en **`public/`** antes del build para que Vite lo copie a `dist/` (el `index.html` ya lo referencia).

---

## Manual de usuario

### Seleccionar carrera

Al abrir la aplicación por primera vez, aparece un selector de carrera. Elige tu institución y carrera para cargar la malla curricular correspondiente.

---

### Marcar ramos

Cada tarjeta de ramo tiene tres estados:

| Estado | Descripción | Cómo activarlo |
|---|---|---|
| **Disponible** | Ramo no tomado | Estado inicial |
| **En curso** | Actualmente cursando | Clic en la tarjeta → botón *En curso* |
| **Aprobado** | Ramo completado | Clic en la tarjeta → botón *Aprobado* |
| **Excepcional** | Aprobado con nota especial | Activar modo Excepcional → clic en la tarjeta |

> Los ramos bloqueados por prerrequisitos no se pueden marcar hasta aprobar los anteriores.

---

### Registrar notas

1. Clic en la tarjeta de un ramo *en curso* o *aprobado*.
2. Haz clic en el botón **Notas**.
3. En el panel lateral agrega evaluaciones con:
   - **Nombre** — ej. Certamen 1
   - **Peso (%)** — porcentaje sobre el total
   - **Nota** — calificación obtenida
4. El promedio ponderado se calcula automáticamente cuando el peso total llega al 100%.

---

### Ver resumen de progreso

- **Desktop:** clic en el botón *Resumen* en la barra lateral.
- **Mobile:** clic en el ícono *Resumen* en la barra de navegación inferior.

El panel muestra:
- Cantidad de asignaturas aprobadas, en curso y totales.
- Porcentaje de avance con barra visual.
- Créditos SCT aprobados, en curso y pendientes.
- Promedio ponderado global (si hay notas registradas).

---

### Gestionar el horario

#### Abrir el horario
- **Desktop:** clic en el botón *Horario* en la barra superior.
- **Mobile:** clic en *Opciones* → *Horario* en la barra inferior.

#### Agregar una clase (mobile)
1. Toca el botón **+** (FAB) en la esquina inferior derecha.
2. Selecciona el ramo, sala y duración.
3. Elige la hora de inicio tocando uno de los botones de horario.
4. Toca **Agregar al horario**.

#### Agregar una clase (desktop)
1. Haz clic en cualquier celda vacía de la planilla para definir día y hora.
2. Completa el formulario en el panel superior (ramo, sala, duración).
3. Haz clic en **Agregar**.

#### Editar o duplicar una clase
1. En mobile: toca la tarjeta de la clase en la lista del día.
2. En desktop: haz clic en el bloque de la clase en la planilla.
3. Modifica los campos y guarda, o usa **Duplicar** para crear una copia en el próximo horario libre.

#### Importar desde cursando
Los ramos marcados como *en curso* aparecen automáticamente como chips en el formulario. Tócalos para seleccionarlos como ramo de la clase que estás agregando.

---

### Próxima clase

El widget *Próxima clase* aparece en la sección de resumen y muestra en tiempo real la próxima clase del día según la hora del dispositivo, incluyendo sala y rango horario. Se actualiza automáticamente al modificar el horario.

---

### Cambiar tema y modo oscuro

- **Desktop:** clic en el selector de colores en la barra superior → elige tema y activa/desactiva modo oscuro.
- **Mobile:** clic en *Opciones* → *Modo Oscuro* y *Tema de color*.

Temas disponibles: Aurora Blue, Sunset Pink, Emerald Mist, Midnight Purple, Golden Carbon.

---

### Ocultar semestres completados

Usa el botón **Ocultar completados** (desktop) u *Ocultar semestres listos* (mobile) para colapsar los semestres con todos los ramos aprobados y enfocarte en los pendientes.

---

### Marcar hasta semestre

Desde *Opciones* (mobile) o la barra superior (desktop), puedes marcar todos los ramos de un semestre o anteriores como aprobados de una vez.

---

## Estructura del proyecto

```
Malla-pro-UCH/
├── public/
│   ├── .htaccess           # Apache / Bluehost — SPA fallback (va a dist/)
│   ├── _redirects          # Redirección SPA para Netlify
│   └── ...
├── src/
│   ├── components/
│   │   ├── DrawerPanel.jsx      # Modal/drawer reutilizable
│   │   ├── HorarioModal.jsx     # Gestión del horario semanal
│   │   ├── MallaViewer.jsx      # Grid de la malla curricular
│   │   ├── MobileBottomNav.jsx  # Barra de navegación mobile
│   │   ├── Navbar.jsx           # Barra superior desktop
│   │   ├── NotasModal.jsx       # Registro de notas
│   │   ├── ProximaClase.jsx     # Widget próxima clase
│   │   ├── ResumenProgreso.jsx  # Panel de estadísticas
│   │   ├── Semestre.jsx         # Contenedor de semestre
│   │   ├── Curso.jsx            # Tarjeta de ramo
│   │   ├── StatsDisplay.jsx     # Área de estadísticas
│   │   └── LoginSuggestion.jsx  # (Desactivado) Login opcional
│   ├── utils/
│   │   └── scheduleUtils.js     # Utilidades de horario
│   ├── data/                    # Archivos JSON de mallas
│   ├── App.jsx                  # Componente raíz
│   ├── main.jsx                 # Entry point
│   └── index.css                # Estilos globales y tokens CSS
├── vercel.json             # Configuración de despliegue Vercel
├── netlify.toml            # Configuración de despliegue Netlify
├── vite.config.js          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind CSS
└── package.json
```

---

## Variables y configuración

Toda la configuración de la aplicación se hace en `src/index.css` mediante variables CSS:

```css
/* Ejemplo — tema Aurora Blue modo claro */
.aurora.light {
  --primary:        #3B82F6;
  --bgPrimary:      #F8FAFC;
  --bgSecondary:    #FFFFFF;
  --bgSurface:      #F1F5F9;
  --textPrimary:    #0F172A;
  --textSecondary:  #64748B;
  --borderColor:    rgba(15,23,42,0.13);
}
```

Los datos se persisten en `localStorage` con estas claves:

| Clave | Contenido |
|---|---|
| `malla-seleccionada` | Carrera activa |
| `malla-aprobados` | IDs de ramos aprobados |
| `malla-cursando` | IDs de ramos en curso |
| `malla-excepciones` | IDs de ramos excepcionales |
| `malla-notas` | Notas por ramo |
| `malla-horario-v1` | Items del horario semanal |
| `malla-theme` | Tema de color activo |
| `malla-darkmode` | Estado del modo oscuro |

---

## Contribuir

1. Haz fork del repositorio.
2. Crea una rama para tu funcionalidad: `git checkout -b feat/nueva-funcionalidad`.
3. Realiza tus cambios y haz commit: `git commit -m "feat: descripción del cambio"`.
4. Sube tu rama: `git push origin feat/nueva-funcionalidad`.
5. Abre un Pull Request describiendo los cambios.

---

> Desarrollado con ❤️ para estudiantes universitarios.

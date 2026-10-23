# Hilo 🧵

**Hilo es una aplicación web de apoyo al estudio que permite grabar y transcribir clases en tiempo real, registrar momentos importantes y organizar el material para repasarlo posteriormente.**

El proyecto nace de una necesidad concreta: poder concentrarse en una explicación sin perder información importante por intentar tomar apuntes al mismo tiempo.

Hilo combina captura de audio, transcripción en tiempo real, anotaciones contextualizadas y herramientas de repaso para transformar una clase en material de estudio organizado.

🌐 **[Ver aplicación](https://hilo-pink.vercel.app/)**

## Funcionalidades

### 🎙️ Grabación y transcripción de clases

- Captura de audio desde el micrófono o desde el audio de la computadora.
- Transcripción en tiempo real mediante AssemblyAI.
- Visualización de texto parcial y definitivo durante la clase.
- Grabación local del audio mediante `MediaRecorder`.
- Controles para pausar, reanudar y finalizar la grabación.
- Estados independientes para la grabación y la transcripción.
- Guardado progresivo de fragmentos de audio en IndexedDB.

La grabación y la transcripción funcionan como procesos independientes. Si la conexión con el servicio de transcripción falla, la grabación local puede continuar.

### 📝 Herramientas durante la clase

Mientras escucha una explicación, el estudiante puede:

- **Agregar notas:** registrar anotaciones asociadas al momento de la clase.
- **Marcar momentos importantes:** identificar explicaciones relevantes y conservar su contexto.
- **Indicar «No entendí»:** guardar el contexto reciente de la transcripción para revisarlo después.
- **Crear branches de foco:** delimitar segmentos específicos de una explicación y conservar sus fragmentos de transcripción.

Estas herramientas permiten organizar la información mientras ocurre la clase, sin esperar a que termine la grabación.

### 📚 Taller de estudio

Al finalizar una clase, Hilo presenta un espacio de repaso que reúne:

- Información de la clase, tema y docente.
- Reproductor de audio.
- Transcripción organizada con marcas de tiempo.
- Notas y momentos importantes.
- Fragmentos asociados a las marcas «No entendí».
- Branches de foco con sus respectivos intervalos y transcripciones.

Desde el Taller también es posible descargar la grabación en formato `.webm` y la transcripción en formato `.txt`.

### 🤖 Continuar estudiando con ChatGPT

Hilo permite preparar una sesión de estudio utilizando la información registrada durante la clase.

El sistema construye un contexto de estudio a partir del material disponible y ofrece dos opciones:

- Copiar el contexto generado.
- Copiarlo y abrir ChatGPT para continuar el estudio.

Esta funcionalidad utiliza la información recopilada por Hilo para facilitar una conversación contextualizada con una herramienta de IA.

**La sesión de estudio se continúa en ChatGPT; no se trata de un chat integrado dentro de Hilo.**

### 💾 Persistencia e historial

Hilo utiliza IndexedDB para almacenar información localmente en el navegador.

El almacenamiento contempla:

- Clase actual y su estado.
- Fragmentos de audio.
- Clases finalizadas.
- Historial de clases asociado al usuario autenticado.

También incorpora mecanismos de recuperación de sesiones y migración de datos almacenados por versiones anteriores de la aplicación.

### 🔐 Autenticación

La aplicación utiliza Supabase para la autenticación y dispone de pantallas de:

- Registro.
- Inicio de sesión.
- Recuperación de contraseña.
- Cambio de contraseña.

Las rutas de grabación y detalle de clases utilizan protección mediante `ProtectedRoute`.

## Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| React 19 | Desarrollo de la interfaz |
| Vite 8 | Entorno de desarrollo y compilación |
| React Router 7 | Navegación y rutas protegidas |
| JavaScript | Lógica de la aplicación |
| CSS | Estilos e interfaz |
| React Context API | Gestión del estado compartido |
| Supabase | Autenticación y persistencia remota |
| IndexedDB | Almacenamiento local de clases y audio |
| MediaRecorder API | Grabación de audio |
| Web Audio API / PCM | Procesamiento del audio para transcripción |
| AssemblyAI | Transcripción en tiempo real |
| WebSocket | Comunicación continua con AssemblyAI |
| Node.js y Express 5 | API local |
| OpenAI API | Servicio de reformulación de preguntas |

## Arquitectura

Hilo separa las responsabilidades de interfaz, estado, captura de audio, transcripción y almacenamiento.

```text
Frontend — React + Vite
│
├── Páginas y componentes
│   ├── Inicio
│   ├── Clase
│   ├── Taller
│   ├── Apuntes
│   └── Autenticación
│
├── Contextos
│   ├── AuthContext
│   └── HiloContext
│
├── Captura y procesamiento de audio
│   ├── audioCapture
│   ├── audioRecorder
│   └── pcmProcessor
│
├── Servicios
│   ├── assemblyService
│   ├── transcriptionService
│   └── classesService
│
└── Almacenamiento
    ├── IndexedDB
    └── Supabase

Backend / API
│
├── Express — desarrollo local
│   ├── GET /api/assembly-token
│   └── POST /api/improve-question
│
└── Endpoint serverless
    └── GET /api/assembly-token
```

### Flujo de grabación y transcripción

```text
Micrófono / Audio de computadora
               │
               ▼
         useClassAudio
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
  MediaRecorder    Procesador PCM
       │                │
       ▼                ▼
  IndexedDB        WebSocket
                        │
                        ▼
                    AssemblyAI
                        │
                        ▼
                 Transcripción
                        │
                        ▼
                    HiloContext
                        │
                        ▼
                 Clase / Taller
```

La grabación se conserva localmente, mientras que el audio procesado se envía al servicio de transcripción.

Los resultados definitivos se incorporan al estado de la clase y pueden recuperarse posteriormente para su consulta.

## Integración con AssemblyAI

La transcripción utiliza el servicio de streaming de AssemblyAI con la siguiente configuración:

| Parámetro | Valor |
|---|---|
| Modelo | `universal-3-5-pro` |
| Protocolo | WebSocket |
| Frecuencia de muestreo | 16.000 Hz |
| Codificación | `pcm_s16le` |
| Autenticación | Token temporal |
| Tiempo máximo de conexión | 15 segundos |
| Espera máxima de finalización | 10 segundos |

El frontend solicita un token temporal a `/api/assembly-token`, evitando utilizar directamente la clave privada de AssemblyAI en el navegador.

Al finalizar una sesión, Hilo detiene el procesamiento PCM, envía los últimos datos disponibles y solicita la terminación de la conexión.

## Instalación y ejecución local

### Requisitos

- Node.js y npm.
- Un proyecto de Supabase configurado.
- Una clave de API de AssemblyAI.
- Una clave de API de OpenAI para el servicio de reformulación de preguntas.

### 1. Clonar el repositorio

```bash
git clone URL_DEL_REPOSITORIO
cd hilo
```

Sustituir `URL_DEL_REPOSITORIO` por la URL correspondiente.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

ASSEMBLYAI_API_KEY=
OPENAI_API_KEY=
```

Completar los valores con las credenciales correspondientes.

**Importante:** las claves privadas de AssemblyAI y OpenAI deben permanecer del lado del servidor. No deben utilizar el prefijo `VITE_` ni exponerse en el frontend.

### 4. Iniciar el backend local

En una terminal:

```bash
node server/server.js
```

El servidor Express utiliza el puerto `3001`.

### 5. Iniciar el frontend

En otra terminal:

```bash
npm run dev
```

Vite inicia el entorno de desarrollo y redirige las solicitudes a `/api` hacia `http://localhost:3001` mediante su configuración de proxy.

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera la compilación de producción |
| `npm run preview` | Permite visualizar la compilación |
| `npm run lint` | Ejecuta Oxlint |

## Persistencia de datos

La aplicación combina almacenamiento local con servicios remotos.

**IndexedDB** permite conservar el estado de una clase, sus fragmentos de audio y el historial local del usuario.

**Supabase** proporciona autenticación y participa en las operaciones de persistencia remota de las clases.

Esta combinación permite recuperar información guardada en el navegador y mantener separadas las responsabilidades del almacenamiento local y remoto.

Los datos almacenados en IndexedDB pertenecen al navegador y al dispositivo donde se generaron; no deben confundirse con archivos sincronizados automáticamente entre dispositivos.

## Consideraciones técnicas

Durante el desarrollo se trabajó especialmente en:

- Separar la grabación de audio de la conexión de transcripción.
- Mantener el estado compartido mediante React Context.
- Guardar progresivamente los fragmentos de audio.
- Recuperar sesiones almacenadas localmente.
- Evitar cierres simultáneos de una misma sesión.
- Esperar las operaciones pendientes antes de finalizar una grabación.
- Gestionar resultados parciales y definitivos de transcripción.
- Liberar conexiones WebSocket y recursos de audio.
- Mantener las credenciales privadas fuera del frontend.

## Objetivo del proyecto

Hilo es un proyecto de desarrollo web orientado a resolver una necesidad real de aprendizaje.

Su desarrollo permitió integrar una interfaz React con autenticación, almacenamiento local y remoto, procesamiento de audio, comunicación WebSocket y servicios de inteligencia artificial.

El objetivo es ofrecer al estudiante una herramienta que le permita registrar una clase, identificar los momentos que necesita revisar y convertir esa información en material útil para continuar estudiando.

---

**Hilo — Que no se te escape el hilo de la clase.**
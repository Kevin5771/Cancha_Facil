# CanchaFácil - Parte 4: aplicación web

Proyecto académico de Análisis de Sistemas II. Implementación del MVP definido en las Partes 1, 2 y 3 mediante **Node.js, Express, PostgreSQL, HTML, CSS y JavaScript**. Se utiliza el paquete `pg` (SQL parametrizado) en vez de Sequelize, que era opcional en la propuesta.

## Arquitectura C4

La base está organizada como un **monolito modular en capas**, con rutas HTTP, servicios de aplicación y repositorios SQL por funcionalidad. Consulta [Arquitectura C4](docs/Arquitectura_C4.md) para los diagramas de contexto, contenedores, componentes y código, las dependencias y las decisiones frente al diseño de la Parte 3.

## Funciones incluidas

- Paleta Luna, modo claro/oscuro persistente y selectores personalizados con navegación por teclado.
- **La grada:** conversación por cancha, respuestas, calificaciones de 1 a 5 estrellas y promedio en el catálogo. Cada cuenta actualiza un solo voto por cancha; autor y administrador pueden eliminar comentarios según sus permisos.
- Interfaz minimalista con fotografías ilustrativas, búsqueda, filtros por deporte, orden por precio, diseño adaptable y clima de Ciudad de Guatemala mediante Open-Meteo. Consulta [Frontend](docs/Frontend.md) para recursos externos y verificación con navegador (`npm run test:ui`).
- Registro de clientes e inicio/cierre de sesión (cookies HttpOnly, hash bcrypt, roles).
- Catálogo público de canchas activas.
- Disponibilidad de canchas por fecha y horario semanal.
- Crear reservaciones con prevención de cruces, incluso en accesos concurrentes (restricción GiST de PostgreSQL).
- Consultar y cancelar únicamente las reservas propias.
- Administrador: CRUD funcional de canchas (alta, lectura, edición y desactivación/activación), configuración y bloqueo de horarios, listado/filtros y cambios de estado de las reservaciones, panel resumen.
- Interfaz web responsiva.

**No incluidos:** pagos, facturación, notificaciones externas, geolocalización y app móvil nativa (fuera del alcance aprobado).

## Requisitos

- Node.js 20 o superior (recomendado 22).
- PostgreSQL 14 o superior.
- npm y navegador moderno.
- Conexión a internet inicialmente para descargar dependencias mediante `npm install`.

## Instalación paso a paso en Windows

1. Descomprime el ZIP y abre la carpeta `CanchaFacil_Parte_4` en Visual Studio Code.
2. Abre pgAdmin y crea una base de datos vacía llamada **`canchafacil`**. (En Query Tool, sobre otra BD, ejecuta `CREATE DATABASE canchafacil;`, o créala desde el menú.)
3. Abre el **Query Tool de la base `canchafacil`** y ejecuta íntegramente `database/schema.sql`. Debe habilitarse `btree_gist` y crearse las seis tablas. Si tu usuario no tiene permiso para la extensión, solicita permiso al administrador de PostgreSQL.
4. En PowerShell, ubicado dentro de la carpeta del proyecto, ejecuta:

   ```powershell
   Copy-Item .env.example .env
   npm install
   ```

5. Abre `.env` y edita **`DATABASE_URL`**, reemplazando `CAMBIA_ESTA_CLAVE` por tu contraseña real de PostgreSQL. Cambia además `JWT_SECRET` por un valor aleatorio de 32 caracteres o más. Si la contraseña de PostgreSQL contiene caracteres reservados de URL como `@`, `#`, `:` o `/`, codifícalos para la URL de conexión.
6. En ese mismo archivo configura `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 10 caracteres, no uses la cadena de ejemplo). Crea el administrador y carga canchas de demostración:

   ```powershell
   npm run crear-admin
   npm run datos-demo
   ```

7. Inicia el servidor:

   ```powershell
   npm start
   ```

8. Abre **http://localhost:3000** en el navegador. Ingresa con la cuenta administradora para modificar horarios o registra una cuenta de cliente para probar el flujo de reserva.

## Arranque posterior

En este equipo puedes encender la base y el servidor con un solo comando: **`npm start`** (también sirve `npm run levantar`). Si ya están funcionando, te muestra la dirección existente sin intentar ocupar otra vez el puerto. El arranque automático de PostgreSQL en Windows se usa cuando `DATABASE_URL` apunta a la instancia local del puerto 5433; las demás conexiones utilizan su servidor configurado. Consulta [Entrega y demostración](docs/Entrega.md) para el recorrido completo y las verificaciones; [Respaldos](docs/Respaldos.md) explica `npm run db:respaldo`, `npm run db:restaurar -- archivo.dump` y `npm run db:verificar-respaldo`.

Para actualizar una instalación anterior con La grada y la novena cancha, ejecuta `npm run db:init` y `npm run datos-comunidad`. Son datos ficticios de demostración; se conservan los registros existentes. Verifica la comunidad con `npm run test:comunidad`.

En este equipo quedó creada una instancia PostgreSQL 18 exclusiva del proyecto en `127.0.0.1:5433`, con datos en `.local/postgres`. Las credenciales de base de datos y de administrador están en `.env`. Ambos quedan excluidos de Git. Para encenderla después de reiniciar Windows:

```powershell
npm run db:local:start
```

Luego inicia la aplicación:

```powershell
npm start
```

La instancia no se registra como servicio de Windows. `npm run db:init` crea la base indicada por `DATABASE_URL` si no existe y aplica `database/schema.sql`; no sustituye un sistema de migraciones para bases existentes. El administrador inicial usa el correo `admin@canchafacil.local` y la contraseña generada en `ADMIN_PASSWORD` dentro de `.env`.

## Ejecutar pruebas unitarias

Para crear cuentas ficticias con credenciales listas para compartir en tu entorno de pruebas, ejecuta `npm run usuarios-prueba`. Se generan seis clientes y una cuenta administradora en la base configurada, con sus accesos en `USUARIOS_PRUEBA.txt`. Repetir el comando conserva las contraseñas generadas; no modifica cuentas preexistentes con otros datos. El TXT y su manifiesto están excluidos de Git. Para verificar esos accesos y las mejoras de conversación, ejecuta `npm run test:chat` con la app encendida.

```powershell
npm test
```

Estas pruebas usan el ejecutor integrado de Node; no requieren conexión a PostgreSQL. Incluyen validaciones, servicios de reservación con adaptador simulado y un servidor HTTP local temporal para comprobar rutas, sesiones y permisos.

## Estructura

```text
CanchaFacil_Parte_4/
  database/schema.sql          Tablas, índices y exclusión de reservas solapadas
  src/server.js                Configuración y arranque del servidor
  src/app.js                   Fábrica createApp, seguridad y composición HTTP
  src/modules/
    auth/                      Registro, credenciales y cuenta
    canchas/                   Catálogo, gestión y disponibilidad
    horarios/                  Franjas semanales y bloqueo
    reservas/                  Creación, consulta y cancelación propias
    admin/                     Filtros, estados y resumen
      routes.js                Adaptación HTTP y autorización (en cada módulo)
      service.js               Casos de uso (en cada módulo)
      repository.js            Consultas SQL (en cada módulo)
  src/infrastructure/database/ Adaptador PostgreSQL y pool
  src/shared/                  Sesión, validación y errores
  src/routes/, src/lib/, db.js  Importaciones de compatibilidad
  public/                      Interfaz web responsiva
  scripts/                     Creación de administrador y datos demo
  test/                        Validaciones, servicios y contrato HTTP
  docs/                        C4, trazabilidad y pruebas manuales
  .env.example                 Plantilla de configuración
```

## Endpoints principales

| Método | Ruta | Acceso | Objetivo |
|---|---|---|---|
| POST | `/api/auth/registro` | Público | Crear cliente |
| POST | `/api/auth/login` | Público | Iniciar sesión |
| POST | `/api/auth/logout` | Público | Cerrar sesión |
| GET | `/api/auth/me` | Autenticado | Ver usuario actual |
| GET | `/api/canchas` | Público | Ver canchas activas |
| GET | `/api/canchas/:id/disponibilidad?fecha=YYYY-MM-DD` | Público | Ver franjas libres |
| GET | `/api/canchas/admin` | Admin | Ver todas las canchas |
| POST | `/api/canchas` | Admin | Crear cancha |
| PUT | `/api/canchas/:id` | Admin | Modificar cancha |
| GET | `/api/horarios?cancha_id=1` | Admin | Listar franjas |
| POST | `/api/horarios` | Admin | Crear franja semanal |
| PATCH | `/api/horarios/:id/estado` | Admin | Bloquear/reactivar horario |
| POST | `/api/reservaciones` | Cliente autenticado | Crear reserva |
| GET | `/api/reservaciones/mias` | Autenticado | Mis reservas |
| PATCH | `/api/reservaciones/:id/cancelar` | Autenticado | Cancelar reserva propia |
| GET | `/api/admin/reservaciones` | Admin | Lista y filtros |
| PATCH | `/api/admin/reservaciones/:id/estado` | Admin | Gestionar estados |
| GET | `/api/admin/resumen` | Admin | Panel resumen |
| GET | `/api/health` | Público | Estado del proceso HTTP |

Las peticiones que escriben datos usan JSON. Las rutas protegidas usan la cookie de sesión creada al iniciar sesión desde el mismo sitio.

## Flujo para demostración

Para poblar la base con datos ficticios de Guatemala, ejecuta `npm run datos-realistas`. Agrega seis canchas, doce clientes y reservas en distintos estados, con tarifas de referencia en quetzales. Conserva los datos existentes y evita duplicar registros al repetir la carga el mismo día. Las fechas se calculan respecto al día de ejecución en `America/Guatemala`; en otro día puede agregar nuevas reservas de demostración.

Los nombres, establecimientos y tarifas son ejemplos inventados, no registros comerciales reales. Los clientes usan correos `@example.com` y no tienen teléfonos. Sus credenciales se guardan en `.local/clientes-demo.json`, excluido de Git. La cuenta administradora conserva su contraseña de `.env`.

1. Como administrador, entrar al panel, crear cancha y registrar horarios para el día escogido.
2. Como cliente, registrarse, consultar la cancha y la fecha, elegir un horario, reservar y consultar "Mis reservas".
3. Intentar reservar exactamente el mismo horario con otro cliente: debe devolver `409`.
4. Cancelar con el primer cliente y comprobar que el horario queda libre otra vez.
5. Como administrador, consultar reservas, filtros, confirmación y resumen.
6. Reiniciar `npm start` y comprobar que la información sigue almacenada en PostgreSQL.

## Observaciones y pendientes de verificación

- En el cierre pasaron las 25 pruebas de `npm test`, los recorridos de cliente/comunidad/chat y la integración administrativa con PostgreSQL. También se verificaron accesibilidad automática, reinicio con persistencia y restauración de respaldo. Consulta [resultados y evidencia](docs/Pruebas_Manuales.md); esto valida el entorno local evaluado, no un despliegue de producción.
- El esquema requiere la extensión estándar `btree_gist` de PostgreSQL.
- El administrador se crea por script, no desde registro público, para evitar que cualquier visitante se conceda permisos.
- La sesión caduca a las 8 horas. No despliegues en producción con las claves de `.env.example`; en producción configura HTTPS y un secreto robusto.
- El sistema usa hora local `America/Guatemala` para validar fechas y horarios.
- La lista administrativa se limita a los últimos 500 registros. Para escalar, implementar paginación.
- La cancelación está disponible mientras la reserva está PENDIENTE o CONFIRMADA; una política de anticipación mínima no estaba especificada y podrá acordarse como cambio futuro.

## Evidencia SDD

Revisa `docs/SDD_Trazabilidad.md` para la relación historia/requerimiento/módulo/ruta/prueba y `docs/Pruebas_Manuales.md` para la plantilla de verificación. Añade capturas **reales**, resultados y commits de GitHub, sin inventar evidencias.

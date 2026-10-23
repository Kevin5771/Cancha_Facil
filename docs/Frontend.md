# Frontend de CanchaFácil

## Pulido de cierre

`forms.js` presenta errores de formato y campos obligatorios junto a sus controles, vincula las explicaciones mediante `aria-describedby` y usa `aria-invalid`. Los errores del servidor aparecen dentro del formulario; no se borran los datos cuando falla el guardado. Durante un envío los botones cambian a un estado de progreso y se rechazan envíos repetidos. Se identifica cada formulario mediante su atributo, evitando conflictos con nombres de campos.

`polish.css` adapta estados de error, tamaño de campos en móvil, tablas desplazables con foco y separadores de fecha del chat. Las conversaciones agrupan los mensajes por fecha de Guatemala y mantienen las respuestas visibles como referencias a comentarios eliminados. Las pruebas automáticas de accesibilidad se ejecutan con `npm run test:accesibilidad`; su alcance y limitaciones se documentan en [Entrega](Entrega.md).

## Footer interactivo

El pie compartido incluye un llamado a reservar, ilustración de cancha con animación sutil, franja de texto, accesos a catálogo, La grada y reservas, filtros por deporte y regreso al inicio con foco en la marca. El número de canchas y los deportes se consultan en la API existente al cargar la página; no son estadísticas inventadas de actividad. Si la consulta falla, se mantienen los accesos generales.

`public/footer.js` compone los controles dinámicos y `public/footer.css` adapta los temas y tamaños de pantalla. Se respeta `prefers-reduced-motion` y la franja se pausa al pasar el cursor o enfocar sus controles. No se agregan dependencias ni servicios de backend.

## Mejoras de conversación y cuentas de prueba

El chat distingue mensajes propios y ajenos, permite buscar por autor o texto entre los mensajes cargados y ofrece actualización manual además de la consulta automática existente. Los nuevos mensajes no desplazan la lectura: se muestra un botón para saltar al final. Al cargar mensajes anteriores se conserva la posición del historial.

Los borradores se guardan por cuenta y cancha en el almacenamiento local del dispositivo. Se recuperan al volver a esa cancha o recargar la página; no se sincronizan con otro dispositivo. Un envío fallido conserva el texto; un envío correcto limpia el borrador enviado. Ctrl + Enter (o Cmd + Enter) publica, mientras Enter permite otra línea. La lógica permanece en `public/community.js` y sus estilos en `public/chat.css`; no se añade un servicio externo.

`npm run usuarios-prueba` prepara seis cuentas CLIENTE y una ADMIN de pruebas, sin cambiar contraseñas de cuentas existentes. Genera `USUARIOS_PRUEBA.txt` en la raíz y conserva su manifiesto en `.local/usuarios-prueba.json`; ambos se excluyen de Git. La cuenta ADMIN tiene acceso administrativo completo. El TXT explica cómo usar ventanas independientes para mantener dos sesiones distintas.

`npm run test:chat` verifica los siete accesos del TXT, borradores por cancha y recarga, búsqueda, posición de lectura, aviso de mensajes nuevos, recuperación de un fallo de envío y el atajo de teclado. Mantiene el borrado lógico de sus publicaciones de prueba. `npm run test:comunidad` conserva la verificación de calificaciones, respuestas y permisos.

## Luna y La grada - 21/10/2026

Paleta aportada por el usuario: `#A7EBF2`, `#54ACBF`, `#26658C`, `#023859`, `#011C40`. `public/luna.css` adapta las superficies, tipografía, botones, tarjetas y controles a modos claro y oscuro. El botón de luna/sol permite cambiar de tema; se recuerda en el navegador y, sin preferencia guardada, se respeta el tema del sistema. La tipografía y los iconos siguen alojados localmente.

Todos los selectores conservan el elemento nativo para formularios, pero presentan un control diseñado con lista de opciones, selección resaltada, flechas de teclado, Inicio/Fin, Escape y foco visible. Funciona en el buscador, orden del catálogo, administración y cambio de cancha de la comunidad.

La nueva sección **La grada** contiene una conversación por cancha, respuestas citadas y estrellas de 1 a 5. El promedio y las valoraciones del catálogo proceden de la base de datos. La lectura es pública; participar exige iniciar sesión. Los ejemplos iniciales, incluidas opiniones y calificaciones, son ficticios. Los mensajes nuevos se consultan cada 15 segundos; no es una conexión WebSocket.

Ejecutar `npm run db:init` y `npm run datos-comunidad` en instalaciones existentes antes de iniciar el backend actualizado. La base agrega dos tablas, sin eliminar datos previos. La nueva carga deja nueve canchas en la base de demostración original.

`npm run test:comunidad` verifica la nueva funcionalidad en navegador. Las capturas quedan en `.local/walkthrough/`: selector Luna, portada oscura, comunidad de escritorio y comunidad móvil. La prueba publica y elimina mensajes de verificación, manteniendo el historial de eliminación.

La interfaz mantiene HTML, CSS y JavaScript sin un proceso de compilación. Se sirve desde Express y consume las rutas existentes de la API. El diseño usa fondo marfil, verde oscuro, acentos lima, fotografía y una navegación flotante, adaptada a escritorio y móvil.

## Funciones

- Catálogo conectado con PostgreSQL: filtros por deporte, búsqueda por nombre y descripción, orden por precio y nombre, y estados sin resultados.
- La fecha elegida en el buscador se conserva al abrir disponibilidad. El buscador filtra el catálogo por deporte; la disponibilidad de horarios se consulta al abrir una cancha.
- Registro, acceso y gestión de reservas conservan los servicios actuales.
- Menú administrativo desplegable: resumen, canchas, horarios y reservaciones.
- Clima actual estimado de Ciudad de Guatemala. No se solicita la ubicación del usuario y no se presenta como clima de cada cancha.
- Foco visible, etiquetas de formularios, filtros con `aria-pressed`, notificaciones accesibles y compatibilidad con movimiento reducido.

## Recursos externos

**Lucide:** iconos SVG de [lucide-static](https://lucide.dev/guide/packages/lucide-static), copiados a `public/assets/icons/`. Su licencia se conserva en esa carpeta.

**DM Sans:** archivos WOFF2 distribuidos mediante `@fontsource/dm-sans`, copiados a `public/assets/fonts/`, con su licencia. La tipografía y los iconos se sirven localmente.

**Unsplash:** fotografías ilustrativas descargadas a `public/assets/`. No son fotografías verificadas de las canchas ficticias de la base. La interfaz lo indica bajo el catálogo y en el pie. Orígenes de las imágenes:

- Portada: `https://images.unsplash.com/photo-1622279457486-62dcc4a431d6`
- Fútbol: `https://images.unsplash.com/photo-1522778119026-d647f0596c20`
- Básquetbol: `https://images.unsplash.com/photo-1546519638-68e109498ffc`
- Voleibol: `https://images.unsplash.com/photo-1592656094267-764a45160876`
- Tenis: `https://images.unsplash.com/photo-1554068865-24cecd4e34b8`

`node scripts/prepare-front-assets.js` vuelve a preparar los recursos; requiere internet y las dependencias de desarrollo. La aplicación no depende de descargar esos recursos en cada visita.

**Open-Meteo:** [documentación de la API](https://open-meteo.com/en/docs). La única solicitud externa del frontend obtiene `temperature_2m` y `weather_code` para las coordenadas 14.6349, -90.5069 y la zona `America/Guatemala`. Tiene un tiempo de espera de seis segundos, no envía cookies y almacena la respuesta durante la sesión de la página. Si falla, conserva solamente el nombre de la ciudad. La CSP permite conexiones a `https://api.open-meteo.com` y mantiene scripts, fuentes y fotografías locales. El pie incluye atribución al proveedor. Revisar sus condiciones de uso antes de un despliegue comercial.

## Verificación repetible

Con la app local encendida y los clientes ficticios cargados, ejecutar:

```powershell
npm install
npx playwright install chromium
npm run test:ui
```

La prueba automatizada comprueba que las imágenes carguen, filtros y orden, conservación de fecha, acceso de cliente, creación y cancelación real de una reserva, pantallas administrativas y diseño móvil sin desbordamiento. También verifica el catálogo cuando el proveedor de clima está bloqueado. Usa los accesos de `.env` y `.local/clientes-demo.json` sin imprimir contraseñas.

El recorrido deja una reserva cancelada como evidencia del flujo real y conserva las reservas existentes. Las capturas y grabaciones se guardan en `.local/walkthrough`, excluido de Git. `npm test` sigue ejecutando las pruebas unitarias y de contrato HTTP sin base real.

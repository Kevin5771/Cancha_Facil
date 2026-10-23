# Respaldar y restaurar PostgreSQL local

Los comandos leen la conexión de `.env` y usan `pg_dump` / `pg_restore`. En Windows buscan las herramientas en `C:/Program Files/PostgreSQL/`; para otra ubicación, definir `PG_BIN` con la carpeta `bin`. Las contraseñas se pasan al proceso mediante variables de entorno, sin imprimirlas ni incluirlas en argumentos de terminal.

## Crear un respaldo

Con PostgreSQL encendido:

```powershell
npm run db:respaldo
```

El comando muestra la ruta exacta del archivo `.dump` creado en `.local/backups/`. Cada respaldo tiene un nombre único; no sobrescribe los anteriores. Contiene la estructura y los datos de la base, incluidas cuentas, horarios y comunidad.

## Verificar que el respaldo se puede recuperar

Ejecutar sin otras pruebas o usuarios escribiendo al mismo tiempo:

```powershell
npm run db:verificar-respaldo
```

Se crea un nuevo respaldo, se restaura en una base temporal con nombre aleatorio y se consultan las seis tablas. Los conteos se comparan con la base original. Finalmente se elimina solamente la base temporal creada para esta verificación; el archivo de respaldo se conserva. Si los conteos difieren, puede haber escrituras concurrentes: el comando lo informa y no modifica la base original.

## Restaurar una copia conservando la base original

Reemplazar la ruta por la mostrada al crear el respaldo:

```powershell
npm run db:restaurar -- ".local/backups/archivo.dump"
```

Se valida el archivo y se crea una base nueva llamada `canchafacil_restaurada_...`. El comando muestra su nombre y los conteos restaurados. La base original y su `.env` permanecen sin cambios. Para usar la copia recuperada, cambiar solamente el nombre de base en `DATABASE_URL` y reiniciar la aplicación después de comprobarla.

La cuenta de conexión necesita permiso para crear bases. Los respaldos quedan fuera de Git dentro de `.local/`; copiar el archivo `.dump` a un lugar adicional si se necesita protección frente a pérdida del equipo. Las cuentas locales no se recrean como roles de PostgreSQL durante la restauración: se usa el propietario configurado en `.env`.

-- CanchaFácil - PostgreSQL (ejecutar dentro de la base canchafacil)
-- El tipo btree_gist permite restricciones de exclusión por cancha + rango.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(140) NOT NULL CHECK (length(trim(nombre)) >= 2),
  correo VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  telefono VARCHAR(30),
  rol VARCHAR(15) NOT NULL DEFAULT 'CLIENTE' CHECK (rol IN ('CLIENTE','ADMIN')),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_normalizado ON usuarios(lower(correo));

CREATE TABLE IF NOT EXISTS canchas (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(70) NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tarifa_referencia NUMERIC(10,2) CHECK (tarifa_referencia >= 0),
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un horario es una franja semanal. 0=domingo ... 6=sábado.
CREATE TABLE IF NOT EXISTS horarios (
  id BIGSERIAL PRIMARY KEY,
  cancha_id BIGINT NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (hora_inicio < hora_fin),
  UNIQUE (cancha_id, dia_semana, hora_inicio, hora_fin)
);
CREATE INDEX IF NOT EXISTS idx_horarios_cancha_dia ON horarios(cancha_id, dia_semana);

CREATE TABLE IF NOT EXISTS reservaciones (
  id BIGSERIAL PRIMARY KEY,
  cliente_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  cancha_id BIGINT NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  horario_id BIGINT NOT NULL REFERENCES horarios(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  estado VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','CONFIRMADA','CANCELADA','FINALIZADA')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (hora_inicio < hora_fin),
  -- Protege incluso dos peticiones simultáneas y franjas que se cruzan.
  CONSTRAINT reservas_sin_solapamiento EXCLUDE USING gist (
    cancha_id WITH =,
    tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') WITH &&
  ) WHERE (estado IN ('PENDIENTE','CONFIRMADA'))
);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente_fecha ON reservaciones(cliente_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha_cancha ON reservaciones(fecha, cancha_id);

-- Comunidad: una valoración por cuenta y cancha; conversación persistente.
CREATE TABLE IF NOT EXISTS calificaciones_cancha (
  cancha_id BIGINT NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  puntuacion SMALLINT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cancha_id, usuario_id)
);
CREATE TABLE IF NOT EXISTS comentarios_cancha (
  id BIGSERIAL PRIMARY KEY,
  cancha_id BIGINT NOT NULL REFERENCES canchas(id) ON DELETE RESTRICT,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  respuesta_a BIGINT,
  contenido VARCHAR(1000) NOT NULL CHECK (length(trim(contenido)) BETWEEN 1 AND 1000),
  eliminado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, cancha_id),
  FOREIGN KEY (respuesta_a, cancha_id) REFERENCES comentarios_cancha(id, cancha_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_comunidad_cancha_cursor ON comentarios_cancha(cancha_id, id DESC);

-- Garantía concurrente de franjas semanales activas, también al reactivarlas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='horarios'::regclass AND conname='horarios_activos_sin_solapamiento') THEN
    ALTER TABLE horarios ADD CONSTRAINT horarios_activos_sin_solapamiento EXCLUDE USING gist (
      cancha_id WITH =,
      dia_semana WITH =,
      tsrange(date '2000-01-01' + hora_inicio, date '2000-01-01' + hora_fin, '[)') WITH &&
    ) WHERE (activo=TRUE);
  END IF;
END $$;

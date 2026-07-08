# Tipstr — World Cup 2026 Prediction App

> Aplicación de predicciones del Mundial 2026 con sistema de porras multi-grupo, ranking en tiempo real e integración con la API oficial de resultados.

**🌐 Live demo:** [mundialtipstr2026.vercel.app](https://tipstrworld2026.vercel.app)

---

## Descripción

Tipstr es una aplicación web completa para gestionar porras del Mundial de Fútbol 2026. Los usuarios se registran, crean o se unen a porras mediante código de invitación, y realizan predicciones sobre los 104 partidos oficiales del torneo, así como sobre los premios FIFA y el rendimiento de la selección española.

El proyecto nació como reemplazo de una app anterior en Vanilla JS + Firebase, con el objetivo de migrarla a un stack moderno con arquitectura multi-pool, autenticación robusta y sincronización automática de resultados vía API externa.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript strict, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Estado | Zustand, React hooks |
| Testing | Vitest, @vitest/coverage-v8 |
| Deploy | Vercel (Hobby) |
| API externa | football-data.org |
| Cron | cron-job.org |

---

## Arquitectura

### Multi-pool (Fantasy-style)
Cualquier usuario puede crear una "porra" y convertirse en su admin, o unirse a una existente mediante código de invitación. Todos los datos (predicciones, resultados, clasificación) están aislados por porra a través de `pool_id`.

```
users
  └── pool_members (role: admin/member, locked_matches/spain/awards)
        └── pools (invite_code, require_approval)
              ├── predictions (por usuario y partido)
              ├── results (por porra — grupos vía API, eliminatorias manual)
              ├── pool_match_teams (equipos reales en el bracket)
              ├── pool_open_phases (qué rondas están abiertas)
              └── pool_spain_squad (plantilla para autocompletado)

global (compartido entre todas las porras)
  ├── global_award_results (Premios FIFA — introducidos por platform admin)
  └── global_spain_results (resultados de España — introducidos por platform admin)
```

### Row Level Security (RLS)
Todas las tablas están protegidas con políticas RLS en PostgreSQL. Se implementó una función `is_pool_member()` con `SECURITY DEFINER` para evitar recursión infinita en las políticas de `pool_members`.

### Sincronización de resultados
- **Fase de grupos**: sincronización automática cada 10 minutos vía cron-job.org → `/api/sync-results` (football-data.org)
- **Eliminatorias**: introducción manual por el admin de cada porra para evitar marcadores de penaltis
- El endpoint incluye normalización de nombres de equipos (inglés → español) y detección automática de inversiones local/visitante

---

## Funcionalidades

### Para usuarios
- Registro e inicio de sesión solo con usuario y contraseña (email derivado internamente)
- Crear porras o unirse mediante código de invitación
- Predicciones de los 104 partidos oficiales del Mundial por fases
- Predicciones de Premios FIFA (Balón de Oro, Bota de Oro, Guante de Oro, etc.)
- Predicciones sobre España (goleadores, fase, victorias, goles, expulsados)
- Bloqueo permanente de predicciones antes del inicio del torneo
- Ver predicciones de otros usuarios (solo tras bloquear las propias)
- Ranking en tiempo real con desglose por partidos, España y premios

### Para admins de porra
- Aprobar o rechazar solicitudes de acceso
- Abrir/cerrar rondas eliminatorias
- Asignar equipos reales al bracket de eliminatorias
- Introducir resultados de eliminatorias manualmente (sin penaltis)
- Gestionar plantilla de España para autocompletado

### Para el admin global (platform admin)
- Introducir resultados oficiales de Premios FIFA y España (compartidos entre todas las porras)

---

## Sistema de Puntuación

| Fase | Exacto | Ganador |
|------|--------|---------|
| Grupos | 3 pts | 1 pt |
| 32avos / Octavos | 5 pts | 2 pts |
| Cuartos | 6 pts | 3 pts |
| Semis / 3er puesto | 8 / 6 pts | 4 / 3 pts |
| Final | 10 pts | 5 pts |

Premios FIFA y predicciones de España tienen valores específicos por campo (entre 4 y 12 puntos).

---

## Testing

```bash
npm test                 # Ejecutar todos los tests
npm run test:coverage    # Tests con informe de cobertura
```

**36 unit tests** con Vitest cubriendo el sistema de puntuación completo:

```
lib/scoring/index.ts  |  97.87%  Stmts  |  92.3%  Branch  |  100%  Funcs
```

Los tests validan todos los escenarios posibles: exacto, ganador, empate, fallo, case-insensitive, acumulación de puntos por fase, edge cases (vacíos, IDs inválidos, sin resultados oficiales).

---

## Migración Firebase → Supabase

El proyecto incluye scripts de migración completa desde la app anterior (YonkiWorld, Vanilla JS + Firebase Realtime Database):

- `migrate.mjs` — migra usuarios, porra, resultados, predicciones, plantilla y fases
- `fix-joselillo.mjs` — fix para usuarios con caracteres especiales (ñ) en el nombre

La migración preserva las contraseñas originales de los usuarios para que puedan entrar sin cambios con sus mismas credenciales.

---

## Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FOOTBALL_DATA_TOKEN=
CRON_SECRET=
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── (auth)/login/           ← Auth con username + password
│   ├── pools/                  ← Listado y creación de porras
│   ├── p/[poolId]/
│   │   ├── partidos/           ← Predicciones de partidos
│   │   ├── grupos/             ← Clasificación de grupos
│   │   ├── espana/             ← Predicciones sobre España
│   │   ├── premios/            ← Premios FIFA
│   │   ├── ver/                ← Ver predicciones de otros
│   │   ├── ranking/            ← Clasificación de la porra
│   │   └── admin/              ← Panel de administración
│   ├── admin-global/           ← Resultados oficiales globales
│   └── api/sync-results/       ← Endpoint de sincronización (cron)
├── components/
├── lib/
│   ├── scoring/                ← Lógica de puntuación (testeada)
│   ├── data/matches.ts         ← 104 partidos, premios, campos España
│   └── supabase/               ← Clientes server/client
└── types/
```

---

## Decisiones técnicas destacadas

- **Auth sin email visible**: los usuarios solo ven username + password. El email se deriva internamente (`username@users.tipstr.app`) con normalización de tildes y ñ para cumplir con Supabase Auth.
- **Resultados globales vs por porra**: los resultados de Premios FIFA y España son globales (un solo admin los introduce para todas las porras), mientras que los resultados de partidos son por porra para permitir flexibilidad.
- **Sync solo en grupos**: la API de football-data.org devuelve el marcador de penaltis como resultado final en eliminatorias, lo que daría puntos incorrectos. Los resultados de eliminatorias los introduce el admin manualmente.
- **RLS con security definer**: se evita la recursión infinita en políticas RLS usando una función `is_pool_member()` con `SECURITY DEFINER` que omite las verificaciones de RLS en la tabla `pool_members`.

---

## Autor

**Alejandro Quiñones** — Full Stack Developer  
[LinkedIn](https://linkedin.com/in/alejandroquiñonesseco) · [GitHub](https://github.com/AlejandroQuinoneSeco)

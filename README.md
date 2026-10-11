# FORJA — React + Phaser + Neon
Prototipo de combate híbrido inspirado en El Bruto, con gráficos originales. React/Vite para la interfaz; Phaser 3 para la arena; motor puro en src/combat.js. Vercel ejecuta las funciones API que acceden a PostgreSQL Neon por HTTP.

## Ejecutar
Node 22+. `npm ci`, `npm run dev`. `npm test` y `npm run build`.
`npm run dev` sirve solo el frontend; para probar API y secretos localmente usa `vercel dev` con DATABASE_URL configurada en el servidor.

## Persistencia
- Local: progreso y últimos 12 duelos en localStorage, guardado automático.
- Neon: Mi luchador → Guardar en Neon / Recuperar progreso. Guardado manual.
- Sesión anónima de 30 días vinculada a una cookie aleatoria de 256 bits, HttpOnly, Secure, SameSite=Lax. En DB solo se guarda SHA-256 del token. Borrar cookies o cambiar de dispositivo impide recuperar ese guardado. No existen cuentas de usuario todavía.
- API comprueba origen para escrituras, valida estructura y limita 20 guardados/minuto por sesión. Esta cuota no es protección global antiabuso ni protección de altas de nuevas sesiones.
- Esquema aislado forja_training, RLS activa sin políticas públicas. Acceso exclusivamente desde servidor con la credencial propietaria. Para producción se recomienda crear un rol específico limitado a estas tablas.
- Las sesiones expiran en 30 días; los registros no se borran automáticamente. Añadir limpieza periódica antes de producción pública.
- Entrenamiento editable por cliente: no es XP competitivo. El servidor aún no valida combates para un ranking.

## Configuración
Vercel: framework Vite, output dist, build npm run build, Node 24, API región cle1. DATABASE_URL es secreto sensible del servidor para production/preview. Nunca VITE_DATABASE_URL. El repositorio no contiene contraseñas.
Migración versionada: db/migrations/001_neon_training.sql; usar conexión directa para migrar. La URL pooler sirve al tráfico normal. scripts/db-task.mjs recibe por stdin oculto JSON con connectionString y action inspect/migrate/verify.
/api/health verifica acceso a la tabla sin revelar credenciales ni datos; /api/game permite GET perfil de sesión y POST {profile} para guardar.

## Mecánicas
Duelo contra IA de hasta 60 segundos simulados. Ataques básicos automáticos. Equilibrado: 120 vida, 9 daño cada 1.5s; Coloso: 145, 12 cada 2s; Ágil: 100, 7 cada 1s. Rival normal 120/9; desafiante 155/12, básicos cada 1.8s.
Energía 65 inicial, 100 máximo, +7/s. Impacto: 26 daño, 35 energía, 8s recarga, interrumpe carga. Guardia: 25 energía, 10s recarga, 70% reducción por 3s. Segundo aire: cura 24, 40 energía, 14s recarga. Rival carga golpe de 29 tras aviso de 1.6s. Teclas 1/2/3 o botones táctiles.
Victoria +35 XP; derrota/empate +15. Nivel cosmético cada 100 XP. A 60s se compara porcentaje de vida; empate si es igual. Sin PvP, ranking, mascotas o inventario.

## Arquitectura futura competitiva
start-match crea snapshot y versión de reglas. finish-match reejecuta acciones registradas por tick en el servidor y concede XP en una transacción idempotente. PvP en vivo requiere un servidor persistente autoritativo por WebSocket; un canal de mensajes no valida combates.

## Git y despliegue
Repositorio: https://github.com/allanz1221/Forja-arena. Vercel se desplegó mediante API; la vinculación para despliegue automático por push queda pendiente.
El despliegue anterior en Sites conserva la primera versión de entrenamiento local; el destino nuevo de esta migración es Vercel.

## Verificación
9 pruebas del motor/validación/API y compilación Vite. La conexión Neon y la migración se verifican por consultas reales. Sin QA visual de navegador en este entorno.

Verificación real adicional: handler de guardado y recuperación con Neon responde 200; otra sesión obtiene profile=null. La sesión de prueba se eliminó al finalizar. En Vercel /api/health y /api/game respondieron 200; el despliegue quedó READY. Falta QA visual y prueba del botón desde un navegador.

# FORJA — React + Phaser + Neon

Prototipo de combate híbrido con gráficos originales. React/Vite muestra la interfaz, Phaser 3 anima la arena y `src/combat.js` contiene el motor determinista. Las funciones Vercel acceden a PostgreSQL Neon desde el servidor.

## Ejecutar

Node 22+. `npm ci`, `npm run dev`, `npm test`, `npm run build`.
Vite sirve el frontend; para probar cuentas y API usa `vercel dev` con `DATABASE_URL` en el servidor. Nunca usar `VITE_DATABASE_URL` ni subir secretos a Git.

## Versión 0.3.3

El Salón de la fama muestra el top 3 y todos los usuarios registrados (incluyendo quienes aún no combatieron) con posiciones globales, nivel, XP, victorias y duelos. Ranking por XP descendente, victorias descendentes y nombre ascendente; páginas de 50, sin filtro de nivel. Disponible también sin iniciar sesión. La posición propia permanece visible aunque esté en otra página. `/api/arena?action=leaderboard&page=1` devuelve solo datos públicos. `scripts/verify-leaderboard.mjs` verifica paginación real de más de 50 cuentas y elimina sus fixtures.

La preparación aparece antes de la arena: inicio directo con la configuración actual o Inicio avanzado para desplegar estilo, estadísticas, tipo de rival y dificultad. Al iniciar correctamente, el foco y el desplazamiento van a la batalla. Las tres habilidades se muestran en una sola fila debajo del duelo, incluso en móvil.

- Tres escenarios con selección uniforme al azar en el servidor al comenzar cada duelo: Estación orbital, Cañón marciano y Base glacial. Se guarda en el snapshot y puede repetirse consecutivamente.
- Máscara de calabaza y gorro de Santa Claus: equipar juntos o por separado y quitar. Persisten en la cuenta y en el snapshot del rival; no otorgan estadísticas.
- Vida, ataque y habilidades escalan por nivel. El servidor obtiene los niveles del XP registrado, sin confiar en valores enviados por el cliente. Reejecución compatible con partidas de versiones 0.2, 0.3.0 y 0.3.1.
- Alien con exotraje y espada de plasma contra robot con armadura, visor y reactor, en un escenario orbital.
- El rival usa Impacto, Guardia y Segundo aire: 65 energía inicial, regeneración de 7/s y mismos costes y recargas que el jugador. Las decisiones de la IA son deterministas, con intervalos de 2s para defensa/curación; no reacciona instantáneamente a los botones. Impacto se anuncia con 1.8s en Normal o 1.3s en Desafiante. No puede usar otras habilidades durante la carga. Interrumpirlo retrasa el siguiente intento 8s. Ambos pueden bloquear daño. Sin habilidades, los tres estilos pierden contra Normal; respondiendo al rival se puede ganar. Los duelos ya iniciados con reglas 0.2 conservan su reejecución anterior.
- Personajes articulados, desplazamientos, espadas, retrocesos, partículas, números de daño y efectos de habilidades. Animaciones de victoria y caída; resultado centrado sobre la arena.
- Registro e inicio de sesión con usuario y contraseña. Usuario público de 3–24 letras, números o guion bajo; contraseña de 10–128 caracteres. Todavía no hay recuperación de contraseña.
- Contraseñas con scrypt y sal; sesiones de 30 días con cookie HttpOnly, Secure, SameSite=Lax. Solo el hash SHA-256 del token se guarda en DB. Comprobación de origen y cuota de autenticación por IP.
- Diez inicios diarios por cuenta, compartidos entre IA y personajes de otros usuarios. Abandonar consume el ataque. Reinicio a medianoche de Sonora, America/Hermosillo (UTC−7). La reserva atómica impide exceder la cuota con solicitudes concurrentes.
- Rivales: hasta 50 usuarios registrados más recientes del mismo nivel, excluyendo la propia cuenta. El servidor revalida el nivel al iniciar y rechaza una selección desactualizada sin consumir cuota. Si no hay rivales, la IA mantiene el mismo nivel del jugador. Usa su estilo guardado como snapshot; la IA controla al rival aunque esté desconectado. No es PvP en vivo. Ser atacado no consume su cuota ni altera su historial.
- Cada inicio emite un matchId con snapshot y versión de reglas. Al finalizar el servidor reejecuta las habilidades por tick y concede XP una sola vez mediante una operación atómica. Los resultados pueden reenviarse sin duplicar recompensas. Expiración a los 15 minutos, incluyendo pausas.
- Progreso e historial asociados a cuenta. El entrenamiento local anterior no se importa; `/api/game` conserva el guardado anónimo antiguo separado del nuevo esquema.

## Mecánicas

Hasta 60 segundos simulados. Ataques básicos automáticos. Equilibrado: 120 vida, 9 daño cada 1.5s; Coloso: 145, 12 cada 2s; Ágil: 100, 7 cada 1s. Centinela R-01 normal: 120 vida, 9 daño cada 1.8s; desafiante: 140 vida, 10 daño cada 1.7s.

Energía: 65 inicial, 100 máximo, +7/s. Impacto: 26 daño, 35 energía, 8s recarga; interrumpe la carga rival. Guardia: 25 energía, 10s recarga, reduce daño 70% por 3s. Segundo aire: cura 24, 40 energía, 14s recarga. El rival usa Impacto de 26 de daño base, 35 energía y 8s de recarga, con carga de 1.8s en Normal o 1.3s en Desafiante. Primera carga a los 5s o 4s respectivamente. La carga requiere energía disponible; el coste se cobra al soltar Impacto. Los personajes de otros jugadores usan las mismas habilidades con sus estadísticas. Teclas 1/2/3 o controles táctiles.

Victoria: 35 XP; derrota o empate: 15. Nivel cada 100 XP: por cada nivel adicional, +10% de vida y ataque base; daño de habilidades, curación y golpe pesado rival escalan en la misma proporción (redondeo al entero más cercano). A los 60s se compara el porcentaje de vida. Sin ranking, inventario, mascotas ni duelos en vivo. La reejecución valida reglas pero no garantiza tiempos humanos: antes de competencia pública, añadir control temporal, prevención de bots y abuso de múltiples cuentas.

## Configuración y datos

Vercel: Vite, `dist`, `npm run build`, Node 24, región cle1. `DATABASE_URL` es variable sensible del servidor en production/preview.

Migraciones: `001_neon_training.sql`, `002_accounts_and_duels.sql` y `003_cosmetics.sql` en `db/migrations`. Ejecutar en orden usando conexión directa. Esquemas separados `forja_training` y `forja_game`, RLS activa sin acceso público, credencial propietaria usada solo desde el servidor. Para producción crear rol limitado y limpieza periódica de sesiones y partidas expiradas.

`scripts/db-task.mjs` recibe JSON por stdin oculto: `connectionString`, `action` y `migrationFile` opcional. `scripts/verify-arena.mjs` recibe `connectionString`; crea dos cuentas de prueba, verifica rival, recompensa idempotente y cuota concurrente compartida, y elimina sus datos.

`/api/arena`: GET estado o `?action=players` (solo mismo nivel); POST acciones `register`, `login`, `logout`, `style`, `cosmetics`, `start`, `finish`. `/api/health`: disponibilidad de DB. `/api/game`: guardado anónimo antiguo.

## Publicación y verificación

Código: https://github.com/allanz1221/Forja-arena. Juego: https://forja-arena.vercel.app. Despliegue Vercel desde archivos fuente mediante API; el proyecto no tiene despliegue automático por push configurado. Sites conserva la versión inicial.

20 pruebas del motor, reejecución, contraseñas, validación y origen; compilación Vite. Verificación real en Neon de registro, directorio, resultados y cuota con concurrencia. Falta QA visual en navegador en este entorno.

## Versionar cada actualización

La versión visible en el pie y la barra lateral se obtiene de `package.json` mediante `src/version.js`; `/api/version` devuelve la versión publicada. Antes de cada actualización publicada ejecutar `npm run version:update` para incrementar el parche (0.3.0 → 0.3.1 → 0.3.2), comprobar pruebas y compilación, y subir package.json/package-lock.json con el resto de cambios. Las reglas de combate tienen versión independiente en el snapshot para conservar la validación de duelos en curso.

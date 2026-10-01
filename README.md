# PetID

Identificación inteligente para mascotas mediante collares y placas con código QR. Las PetIDs se fabrican **genéricas** (sin datos de mascota), se venden, y el cliente las activa escaneando el QR y registrando a su mascota. Quien la encuentre escanea la placa, ve su perfil público y avisa al dueño sin crear una cuenta.

Stack: Angular 21 (standalone, signals, zoneless) · Tailwind CSS 4 · Supabase (Auth, Postgres, Storage, RLS) · PWA · Cloudflare Pages.

## Flujo

```
Admin genera PetID genérica (PET-00001 + qr_token aleatorio)
  → descarga/imprime el QR (PNG, SVG, PDF o plancha A4)
  → fabricación → venta (estado Vendida)
  → el cliente escanea /p/{qr_token}: "Activa tu PetID"
  → /activate/{qr_token}: crea cuenta o inicia sesión → registra a su mascota
  → PetID Activada: el QR muestra el perfil público de la mascota
```

- El QR codifica solo `https://DOMINIO/p/{qr_token}`. No depende del nombre de la mascota y nunca cambia.
- Cada PetID se activa **una sola vez**. Un segundo intento muestra "Esta PetID ya está activada".
- Estados: `available` (Disponible), `reserved` (Reservada), `sold` (Vendida), `activated` (Activada), `blocked` (Bloqueada). Una PetID bloqueada no muestra nada al escanearla.
- Si el dueño elimina a su mascota, la PetID vuelve a *Vendida* y se puede activar de nuevo.
- Cada escaneo queda registrado (fecha, tipo de dispositivo y zona aproximada), también antes de activar.

## Plan anual

- Activar la PetID incluye **1 año de servicio completo** (`pet_ids.expires_at`). Eliminar la mascota y volver a activar la placa no reinicia el año.
- **Al vencer, modo básico:** el QR sigue mostrando foto, nombre, raza y cómo contactar al dueño (Llamar/WhatsApp y el formulario "Encontré esta mascota"). Se ocultan descripción, datos de salud y el botón de GPS. El dueño no puede editar el perfil (salvo marcarla perdida/encontrada o pausarla) y los escaneos ya no le notifican. Los reportes de "la encontré" sí le notifican siempre.
- **Aviso previo:** el dashboard muestra el vencimiento y, desde 30 días antes, un aviso con el botón *Renovar*, que abre el formulario de soporte con el tema "Renovar mi plan". Un job diario de `pg_cron` envía una notificación push a los 30 días, a los 7 días y el día que vence (usa la misma función `push-owner`).
- **Renovar:** tras recibir el pago, en *Admin → PetIDs → (código) → Renovar 1 año*. Suma un año desde hoy si ya venció, o desde su fecha de vencimiento si aún no vence.
- Las PetIDs demo (`demo-*`) no vencen.

## Aviso automático al escanear

1. **Zona aproximada en cada escaneo.** La página pública consulta `/api/geo` (Cloudflare Pages Function en `functions/api/geo.js`), que devuelve la ciudad y región según la conexión del visitante. No se guarda su IP. Es una estimación que puede fallar por varios kilómetros. En desarrollo local no hay `/api/geo` y el escaneo se guarda sin zona.
2. **GPS automático si la mascota está perdida.** Al abrir el perfil de una mascota marcada como perdida, el navegador pregunta si comparte la ubicación. Si acepta, se envía sola. Si no es una mascota perdida, está el botón "Enviar mi ubicación". Antes de enviar, la app espera hasta 8 segundos por una señal GPS con menos de 50 m de margen y manda la más precisa que consiguió. El navegador **siempre** pide permiso: ninguna web puede leer el GPS sin él.
3. **Notificación push al dueño.** Cuando escanean la placa, comparten el GPS o reportan que la encontraron, un trigger llama a la Edge Function `push-owner`, que envía una notificación a los dispositivos del dueño. Después de avisar un escaneo, los siguientes escaneos de esa placa no avisan durante 2 minutos. El dueño las activa desde su dashboard ("Activar avisos"). En iPhone, primero hay que agregar PetID a la pantalla de inicio.
4. **Historial de avisos.** La campana del menú del dueño abre `/avisos`: reportes de "la encontré", ubicaciones compartidas y escaneos que avisaron, del más nuevo al más antiguo. El contador muestra lo que llegó desde la última visita. "Limpiar historial" solo oculta lo anterior de esa vista. No borra nada: la actividad de cada mascota y el admin siguen viéndolo.

### Configurar las notificaciones push

Las claves VAPID y el secreto están en `supabase/functions/.env` y los secretos de Vault en `supabase/push-secrets.local.sql`. Ambos archivos los ignora git. Si no existen, genéralos de nuevo; la clave pública va en `vapidPublicKey` de los environments.

1. Ejecuta las migraciones 3 y 4, y luego `supabase/push-secrets.local.sql` en el *SQL Editor*.
2. Despliega la función:
   ```bash
   npx supabase login
   npx supabase functions deploy push-owner --no-verify-jwt --project-ref TU-PROJECT-REF
   npx supabase secrets set --env-file supabase/functions/.env --project-ref TU-PROJECT-REF
   ```
   Sin CLI: *Edge Functions → Deploy a new function → Via Editor*, nómbrala `push-owner`, pega `supabase/functions/push-owner/index.ts`, desactiva *Verify JWT* y agrega los 4 secretos de `supabase/functions/.env` en *Edge Functions → Secrets*.
3. Las notificaciones solo funcionan en la versión compilada (con service worker) y sobre HTTPS o `localhost`: pruébalas con el deploy en Cloudflare Pages.

## Puesta en marcha

1. **Crear el proyecto en Supabase** en [supabase.com](https://supabase.com). En *Authentication → Sign In / Providers → Email*, desactiva *Confirm email* para que el registro entre directo. En *Project Settings → Data API*, las tablas nuevas no se exponen solas: las migraciones incluyen sus propios `grant`.
2. **Crear el esquema.** En *SQL Editor* ejecuta, en orden:
   1. `supabase/migrations/20260925000000_init.sql`
   2. `supabase/migrations/20260926000000_pet_ids.sql`
   3. `supabase/migrations/20260927000000_scan_alerts.sql`
   4. `supabase/migrations/20260927000100_push_triggers.sql`
   5. `supabase/migrations/20260927000200_role_cliente.sql`
   6. `supabase/migrations/20260927000300_products.sql`
   7. `supabase/migrations/20260928000000_pet_cover.sql`
   8. `supabase/migrations/20260928000100_support_reviews.sql`
   9. `supabase/migrations/20260929000000_yearly_plan.sql`
   10. `supabase/migrations/20260929000100_scan_notified_at.sql`
   11. `supabase/migrations/20261001000000_owner_notifications.sql`
   12. `supabase/migrations/20261001000100_found_report_optional.sql`
   13. `supabase/migrations/20261001000200_notifications_realtime.sql`

   Con Supabase CLI también sirve `supabase link` y luego `supabase db push`.
3. **Configurar URLs de Auth.** En *Authentication → URL Configuration*, pon `http://localhost:4200` como *Site URL* y agrega `http://localhost:4200/**` en *Redirect URLs*.
4. **Conectar la app.** Copia *Project URL* y la *publishable key* (*Project Settings → API Keys*) en `src/environments/environment.development.ts` y `environment.ts`.
5. **Crear un administrador.** Regístrate en la app y luego, en *SQL Editor*:
   ```sql
   update public.profiles set role = 'admin' where email = 'tu@correo.cl';
   ```
   Recarga la app: aparece el enlace **Admin** (`/admin`). Todo registro nuevo queda con `role = 'cliente'`; el rol solo se puede cambiar desde SQL o con la service role.
6. **Datos de prueba** (opcional):
   ```bash
   cp .env.example .env   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y opcional ADMIN_EMAIL
   npm run seed
   ```
   | Qué | Dónde |
   | --- | --- |
   | Dueño | `demo@petid.app` / `PetID-demo-2026` (Max y Luna; Luna perdida, con un aviso) |
   | Admin | `admin@petid.app` / `PetID-admin-2026` (y `ADMIN_EMAIL` si lo defines) |
   | Perfiles públicos | `/p/demo-max`, `/p/demo-luna` |
   | PetID sin activar | `/p/demo-nueva` → `/activate/demo-nueva` |

   La service role key va **solo** en `.env` (ignorado por git). Nunca en el frontend ni en un chat.

   Sin service role key: pega `supabase/demo.sql` en el *SQL Editor* y ejecútalo. Crea el dueño demo con Max (`/p/demo-max`, PetID `DEMO-0001`); no crea el admin demo.
7. **Levantar la app:**
   ```bash
   npm install
   npm start          # http://localhost:4200
   ```

Para probar el escaneo desde un teléfono en la misma red, usa `npx ng serve --host 0.0.0.0` y abre `http://IP-DE-TU-PC:4200/p/demo-max`. La geolocalización requiere HTTPS fuera de `localhost`: usa un túnel (`cloudflared`, `ngrok`) o el deploy.

## Panel de administración (`/admin`)

| Sección | Qué hace |
| --- | --- |
| Dashboard | PetIDs por estado, mascotas, perdidas, reportes nuevos, escaneos de 7 días y últimas activaciones |
| PetIDs | Generar 1–200 PetIDs, filtrar, buscar, imprimir en lote, marcar como vendidas |
| Detalle PetID | QR, descargas PNG/SVG/PDF, imprimir, copiar URL, cambiar estado o bloquear, dueño y mascota vinculados |
| Activaciones | PetIDs activadas con su dueño y mascota |
| Mascotas / Usuarios / Reportes | Listados de solo lectura |
| Soporte | Mensajes del formulario de contacto: responder por email, marcar resuelto o reabrir |
| Reseñas | Calificaciones de clientes; ocultar o mostrar en la página principal |
| Productos | Catálogo: nombre, tipo (collar/placa/tag), foto, precio CLP, variantes de color/talla con stock. Los activos se muestran en la página principal (sin carrito) |
| Configuración | Reservada para próximas versiones |

El admin **no** ingresa datos de mascotas: solo genera y gestiona los identificadores físicos.

## Estructura

```
src/app/
  core/
    auth/        AuthService (rol), guards (authGuard, guestGuard, adminGuard), errores
    data/        Repositorios Supabase: pets (dueño + activación), activity, public-pet, admin
    models/      User, Pet, PetId, EmergencyContact, Scan, FoundReport, PublicPet
    supabase/    Cliente y almacenamiento de sesión ("Recordar sesión")
  features/
    landing/     Página de venta
    auth/        login, register, forgot-password, reset-password (con returnUrl)
    activation/  /activate/:qrToken
    public-pet/  /p/:qrToken, banner de perdida, contacto, "Encontré esta mascota"
    dashboard/   Mascotas del dueño y PetID
    notifications/ /avisos: historial de avisos del dueño
    pets/        pet-form (activación/edición), pet-qr, pet-activity
    admin/       layout, sidebar, dashboard, pet-ids, activations, pets, users, reports, support, reviews
  layout/        Layout del área del dueño (campana con contador de avisos)
  shared/        UI (icon, qr-card, badges), pipes, utilidades (qr-label: SVG/PNG/PDF/impresión)
supabase/
  migrations/    Esquema, RLS, funciones y bucket de fotos
  functions/     push-owner, notify-support (email a soporte), notify-owner (email opcional)
scripts/seed.mjs Datos de prueba
```

## Seguridad y privacidad

- **RLS en todas las tablas.** El dueño solo ve sus mascotas, PetIDs, contactos, escaneos y avisos. El admin tiene lectura global (`is_admin()`).
- **`pet_ids` es de solo lectura desde el cliente.** Crear, cambiar estado y activar pasa por funciones `SECURITY DEFINER` (`admin_create_pet_ids`, `admin_set_pet_id_status`, `activate_pet_id`) que validan rol, estado y transición. Las PetIDs no se eliminan, así un token impreso nunca se reasigna.
- **Mascotas solo vía activación.** No existe mascota sin PetID.
- **El visitante no toca tablas.** Usa `get_public_pet_id`, `record_scan`, `submit_found_report` y `share_location`, que devuelven solo campos públicos y limitan la frecuencia.
- **Qué ve el visitante:** nombre de pila del dueño; su teléfono solo si activó Llamar/WhatsApp; salud solo si lo permitió. Nunca email ni apellido.
- **Privacidad del visitante:** la IP nunca se guarda; solo la ciudad o región estimada. El GPS se guarda redondeado (~1 km) en el escaneo y solo si la persona acepta compartirlo. El dueño ve fecha y tipo de dispositivo, no el user agent completo.
- **Push:** `push-owner` solo acepta llamadas con el secreto compartido y vuelve a leer la fila desde la base de datos en vez de confiar en el payload.

## Soporte y reseñas

- **Contacto (`#soporte` en la landing).** Cualquiera puede escribir. Máximo 5 mensajes por email por hora. Cada mensaje se guarda en `support_messages` (visible en *Admin → Soporte*) y un trigger llama a la Edge Function `notify-support`, que lo envía por email a `SUPPORT_EMAIL` con *Responder a* apuntando al cliente.
- **Reseñas (`#resenas`).** Estrellas de 1 a 5 y comentario opcional. Solo clientes con al menos una mascota registrada, una reseña por cuenta (se puede editar o borrar). Se publica el nombre de pila. El admin puede ocultarlas.

Para activar el email de soporte (requiere cuenta en [Resend](https://resend.com)):

1. Ejecuta la migración 8. Usa el mismo secreto `push_owner_secret` de Vault que las notificaciones push; crea la URL de la función en el *SQL Editor*:
   ```sql
   select vault.create_secret('https://TU-PROJECT-REF.supabase.co/functions/v1/notify-support', 'notify_support_url');
   ```
2. Despliega la función sin verificación JWT:
   ```bash
   npx supabase functions deploy notify-support --no-verify-jwt --project-ref TU-PROJECT-REF
   npx supabase secrets set RESEND_API_KEY=... NOTIFY_FROM="PetID <onboarding@resend.dev>" SUPPORT_EMAIL=tu@correo.cl APP_URL=https://tudominio.cl --project-ref TU-PROJECT-REF
   ```
   `WEBHOOK_SECRET` ya existe si configuraste `push-owner`. Con el remitente de prueba `onboarding@resend.dev`, Resend solo entrega al email de tu cuenta Resend; para otros destinos verifica tu dominio.

Sin la función, los mensajes igual quedan guardados en *Admin → Soporte*.

## Notificación por email (opcional)

```bash
supabase functions deploy notify-owner
supabase secrets set RESEND_API_KEY=... NOTIFY_FROM="PetID <avisos@tudominio.cl>" APP_URL=https://tudominio.cl
```

Luego, en *Database → Webhooks*, crea dos webhooks INSERT sobre `found_reports` y `location_shares` que apunten a la función.

## Deploy en Cloudflare Pages

1. **Antes de imprimir cualquier PetID**, define `publicBaseUrl` en `src/environments/environment.ts` con el dominio definitivo (por ejemplo `https://petid.cl`). Los QR se generan con esa URL; el panel admin avisa mientras no esté definida.
2. En Cloudflare Pages conecta el repositorio:
   - Build command: `npm run build`
   - Output directory: `dist/PetID/browser`
3. `public/_redirects` ya incluye el fallback SPA (`/* /index.html 200`). `functions/api/geo.js` se despliega sola como Pages Function, y `public/_routes.json` limita las Functions a `/api/*`.
4. Agrega el dominio en *Site URL* y *Redirect URLs* de Supabase.

## Preparado para crecer

- **NFC:** el chip graba la misma URL `/p/{qr_token}`.
- **Tienda, pagos e inventario:** una tabla `products` y `orders` que referencien `pet_ids` (el estado `reserved` ya existe para pedidos en curso).
- **Suscripciones y planes premium:** columnas o tabla en `profiles`.
- **GPS e historial de ubicaciones:** extienden `location_shares`.
- **Múltiples dueños / transferencia:** una tabla `pet_owners` y ajustar las políticas RLS.
- **App Ionic:** reutiliza `core/` (modelos, repositorios, auth) tal cual.

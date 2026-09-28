import type { CSSProperties, ReactNode } from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { Caption, clamp, easeInOut, Icon, LightBackground, Phone, SCREEN_H, SCREEN_W, StatusBar, Tap, useSpring } from './components';
import { color, sans, type IconName } from './theme';

const IOS_BLUE = '#0a84ff';
const SHEET_BG = '#f2f2f7';

function pressAt(frame: number, at: number) {
  return interpolate(frame, [at - 2, at + 3, at + 10], [1, 0.94, 1], clamp);
}

function PetIdAppIcon({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.23, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px -8px rgba(0,0,0,0.5)' }}>
      <Icon name="paw" size={size * 0.52} />
    </div>
  );
}

// ─── Home screen ────────────────────────────────────────────────────────────

const HOME = { top: 130, row: 156, icon: 104, cols: [105, 235, 365, 495] };
const PETID_SLOT = { x: HOME.cols[0], y: HOME.top + HOME.row * 2 };
const APPS: { emoji: string; label: string; bg: string }[] = [
  { emoji: '📷', label: 'Cámara', bg: '#e5e7eb' }, { emoji: '🖼️', label: 'Fotos', bg: '#fff' },
  { emoji: '🗺️', label: 'Mapas', bg: '#dcfce7' }, { emoji: '⚙️', label: 'Ajustes', bg: '#d1d5db' },
  { emoji: '🌤️', label: 'Clima', bg: '#bae6fd' }, { emoji: '📅', label: 'Calendario', bg: '#fff' },
  { emoji: '🎵', label: 'Música', bg: '#fecdd3' }, { emoji: '📝', label: 'Notas', bg: '#fef9c3' },
];
const DOCK = ['📞', '🧭', '💬', '✉️'];

function AppTile({ x, y, label, children, scale = 1 }: { x: number; y: number; label: string; children: ReactNode; scale?: number }) {
  return (
    <div style={{ position: 'absolute', left: x - 60, top: y, width: 120, textAlign: 'center', fontFamily: sans, transform: `scale(${scale})` }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>{children}</div>
      <div style={{ marginTop: 8, fontSize: 19, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{label}</div>
    </div>
  );
}

/** Home screen (iOS or Android look); `petId` controls the PetID icon (0 = hidden, 1 = shown). */
function HomeScreen({ petId, glow = 0, android = false }: { petId: number; glow?: number; android?: boolean }) {
  const radius = android ? 999 : 24;
  return (
    <div style={{ position: 'absolute', inset: 0, background: android ? 'linear-gradient(170deg, #1e3a5f 0%, #0f766e 55%, #134e4a 100%)' : 'linear-gradient(160deg, #0f766e 0%, #134e4a 45%, #1e1b4b 100%)' }}>
      {APPS.map((a, i) => (
        <AppTile key={a.label} x={HOME.cols[i % 4]} y={HOME.top + HOME.row * Math.floor(i / 4)} label={a.label}>
          <div style={{ width: HOME.icon, height: HOME.icon, borderRadius: radius, background: a.bg, display: 'grid', placeItems: 'center', fontSize: 54 }}>{a.emoji}</div>
        </AppTile>
      ))}
      {petId > 0 && (
        <AppTile x={PETID_SLOT.x} y={PETID_SLOT.y} label="PetID" scale={petId}>
          <div style={{ position: 'relative' }}>
            {glow > 0 && (
              <div style={{ position: 'absolute', inset: -14, borderRadius: android ? 999 : 36, border: `5px solid ${color.mint}`, opacity: glow, transform: `scale(${1 + (1 - glow) * 0.2})` }} />
            )}
            {android
              ? <div style={{ borderRadius: 999, overflow: 'hidden' }}><PetIdAppIcon size={HOME.icon} /></div>
              : <PetIdAppIcon size={HOME.icon} />}
          </div>
        </AppTile>
      )}
      {android ? (
        <>
          <div style={{ position: 'absolute', left: 24, right: 24, bottom: 150, display: 'flex', justifyContent: 'space-around' }}>
            {DOCK.map((e) => (
              <div key={e} style={{ width: HOME.icon, height: HOME.icon, borderRadius: 999, background: 'rgba(255,255,255,0.9)', display: 'grid', placeItems: 'center', fontSize: 52 }}>{e}</div>
            ))}
          </div>
          <div style={{ position: 'absolute', left: 40, right: 40, bottom: 50, height: 76, borderRadius: 999, background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', fontFamily: sans, fontSize: 24, color: '#5f6368' }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#4285f4' }}>G</span> Buscar
          </div>
        </>
      ) : (
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 26, height: 140, borderRadius: 46, background: 'rgba(255,255,255,0.22)', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {DOCK.map((e) => (
            <div key={e} style={{ width: HOME.icon, height: HOME.icon, borderRadius: 24, background: 'rgba(255,255,255,0.9)', display: 'grid', placeItems: 'center', fontSize: 52 }}>{e}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Paso 8 · Instalar en iPhone ────────────────────────────────────────────

const TOOLBAR_Y = SCREEN_H - 78;
const TOOL_X = [66, 183, 300, 417, 534];

/**
 * Mocks of the real mobile screens, drawn at ~1.54 px per CSS px (phone ≈ 390 pt wide, root font 15 px).
 */
const WEB = { ink: '#1c2733', muted: '#64748b', surface: '#f7f8f5', brand50: '#effaf6', brand100: '#d8f3e8', brand700: '#166555', brand800: '#155145', ring: '#e2e8f0' };
const PAD = 25;
const HEADER = { top: 70, height: 96 };

function WebLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: WEB.ink }}>
      <div style={{ width: 52, height: 52, borderRadius: 17, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center' }}><Icon name="paw" size={30} /></div>
      <span>Pet<span style={{ color: color.brand }}>ID</span></span>
    </div>
  );
}

function WebHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'absolute', top: HEADER.top, left: 0, right: 0, height: HEADER.height, padding: `0 ${PAD}px`, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', borderBottom: '1.5px solid rgba(15,23,42,0.05)', background: 'rgba(247,248,245,0.9)', zIndex: 2,
    }}>
      <WebLogo />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

function WebButton({ children, primary = false, height = 74, fontSize = 23, style }: { children: ReactNode; primary?: boolean; height?: number; fontSize?: number; style?: CSSProperties }) {
  return (
    <div style={{
      height, borderRadius: 23, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize, fontWeight: 600,
      background: primary ? color.brand : '#fff', color: primary ? '#fff' : WEB.ink, boxShadow: primary ? 'none' : `inset 0 0 0 1.5px ${WEB.ring}`, ...style,
    }}>{children}</div>
  );
}

function LandingMock({ offset = 0 }: { offset?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: WEB.surface, transform: `translateY(${offset}px)`, fontFamily: sans }}>
      <div style={{ position: 'absolute', right: -220, top: -120, width: 560, height: 560, borderRadius: 999, background: `radial-gradient(circle, ${WEB.brand100} 0%, rgba(216,243,232,0) 70%)` }} />
      <WebHeader>
        <div style={{ padding: '0 16px', fontSize: 21, fontWeight: 600, color: WEB.muted }}>Ingresar</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderRadius: 17, background: color.brand, color: '#fff', fontSize: 20, fontWeight: 600 }}>
          <Icon name="paw" size={22} /> Activar mi PetID
        </div>
      </WebHeader>
      <div style={{ position: 'absolute', top: 224, left: PAD, right: PAD, color: WEB.ink }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 16px', borderRadius: 999, background: '#fff', boxShadow: `inset 0 0 0 1.5px ${WEB.brand100}`, fontSize: 20, fontWeight: 600, color: WEB.brand700 }}>
          <Icon name="paw" size={22} /> Identificación inteligente para mascotas
        </div>
        <div style={{ marginTop: 29, fontSize: 38, lineHeight: 1.25, fontWeight: 800, letterSpacing: -1 }}>
          Tu mascota no puede decir dónde vive. <span style={{ color: color.brand }}>Su QR sí.</span>
        </div>
        <div style={{ marginTop: 29, fontSize: 23, lineHeight: 1.5, color: WEB.muted }}>
          Una placa con código QR único. Si tu mascota se pierde, quien la encuentre escanea la placa y te avisa al instante, sin apps y sin exponer tus datos personales.
        </div>
        <WebButton primary style={{ marginTop: 46 }}><Icon name="paw" size={29} /> Cómo funciona</WebButton>
        <WebButton style={{ marginTop: 18 }}><Icon name="eye" size={29} width={2} /> Ver perfil de ejemplo</WebButton>
        <div style={{ marginTop: 23, fontSize: 20, color: WEB.muted }}>Pago único · Sin suscripción · Perfil activo para siempre</div>
        <div style={{ position: 'relative', marginTop: 80, height: 420 }}>
          <div style={{ position: 'absolute', left: '50%', top: -30, width: 25, height: 62, marginLeft: -12, borderRadius: 999, background: '#cbd5e1', boxShadow: '0 0 0 6px #e2e8f0', zIndex: 1 }} />
          <div style={{ position: 'absolute', left: '50%', top: 0, width: 415, height: 415, marginLeft: -207, borderRadius: 999, background: 'linear-gradient(135deg, #289d80, #155145)', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: 340, height: 340, borderRadius: 999, background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 4, color: WEB.brand700 }}>PETID</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: WEB.ink }}>MAX</div>
              <div style={{ marginTop: 10, width: 150, height: 150, background: `repeating-conic-gradient(${WEB.ink} 0 25%, #fff 0 50%) 0 0 / 30px 30px`, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SafariPage({ sharePressed }: { sharePressed: number }) {
  const tools: IconName[] = ['chevronLeft', 'chevronRight', 'share', 'book', 'tabs'];
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f7f8f5', fontFamily: sans }}>
      <LandingMock />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 196, background: 'rgba(249,249,251,0.96)', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ margin: '16px 26px 0', height: 62, borderRadius: 18, background: '#e9e9ee', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 24, fontWeight: 600, color: '#111' }}>
          <Icon name="lock" size={20} stroke="#6b7280" width={2.4} /> mipetid.pages.dev
        </div>
        {tools.map((t, i) => (
          <div key={t} style={{ position: 'absolute', left: TOOL_X[i] - 24, top: TOOLBAR_Y - (SCREEN_H - 196) - 24, color: IOS_BLUE, transform: t === 'share' ? `scale(${sharePressed})` : undefined }}>
            <Icon name={t} size={48} width={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

const SHEET_TOP = 330;
const LIST_TOP = 300;
const ROW_H = 86;
const ACTIONS: { icon: IconName; label: string }[] = [
  { icon: 'copy', label: 'Copiar' },
  { icon: 'book', label: 'Agregar a lista de lectura' },
  { icon: 'book', label: 'Agregar marcador' },
  { icon: 'star', label: 'Agregar a favoritos' },
  { icon: 'search', label: 'Buscar en la página' },
  { icon: 'squarePlus', label: 'Agregar a pantalla de inicio' },
];
const TARGET_ROW = ACTIONS.length - 1;
const LIST_SCROLL = 230;

function ShareSheet({ enter, scroll, highlight }: { enter: number; scroll: number; highlight: number }) {
  const apps = [{ e: '📡', l: 'AirDrop' }, { e: '💬', l: 'Mensajes' }, { e: '✉️', l: 'Mail' }, { e: '🟢', l: 'WhatsApp' }];
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.3 * enter})`, zIndex: 20 }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, top: SHEET_TOP, bottom: 0, zIndex: 21, borderRadius: '34px 34px 0 0', background: SHEET_BG,
        transform: `translateY(${(1 - enter) * (SCREEN_H - SHEET_TOP)}px)`, overflow: 'hidden', fontFamily: sans,
      }}>
        <div style={{ position: 'absolute', top: -scroll, left: 0, right: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '30px 30px 0' }}>
            <PetIdAppIcon size={76} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#111' }}>PetID</div>
              <div style={{ fontSize: 21, color: '#6b7280' }}>mipetid.pages.dev</div>
            </div>
            <div style={{ width: 48, height: 48, borderRadius: 999, background: '#e5e5ea', display: 'grid', placeItems: 'center', color: '#6b7280' }}><Icon name="x" size={26} width={2.6} /></div>
          </div>
          <div style={{ display: 'flex', gap: 34, padding: '34px 30px 0' }}>
            {apps.map((a) => (
              <div key={a.l} style={{ width: 100, textAlign: 'center' }}>
                <div style={{ width: 100, height: 100, borderRadius: 999, background: '#fff', display: 'grid', placeItems: 'center', fontSize: 50 }}>{a.e}</div>
                <div style={{ marginTop: 8, fontSize: 18, color: '#111' }}>{a.l}</div>
              </div>
            ))}
          </div>
          <div style={{ position: 'absolute', top: LIST_TOP, left: 26, right: 26, borderRadius: 22, background: '#fff', overflow: 'hidden' }}>
            {ACTIONS.map((a, i) => (
              <div key={a.label} style={{
                height: ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 26px',
                borderTop: i ? '1px solid #e5e5ea' : 'none', fontSize: 25, color: '#111', fontWeight: i === TARGET_ROW ? 700 : 500,
                background: i === TARGET_ROW ? `rgba(26,126,104,${0.1 + highlight * 0.18})` : '#fff',
              }}>
                {a.label}
                <Icon name={a.icon} size={34} stroke={i === TARGET_ROW ? color.brand : '#111'} width={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AddToHomeDialog({ enter, addPressed }: { enter: number; addPressed: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 25, background: SHEET_BG, fontFamily: sans, transform: `translateY(${(1 - enter) * SCREEN_H}px)` }}>
      <div style={{ position: 'absolute', top: 96, left: 30, right: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 26 }}>
        <span style={{ color: IOS_BLUE }}>Cancelar</span>
        <span style={{ fontWeight: 700, color: '#111' }}>Agregar a inicio</span>
        <span style={{ color: IOS_BLUE, fontWeight: 700, transform: `scale(${addPressed})` }}>Agregar</span>
      </div>
      <div style={{ position: 'absolute', top: 190, left: 26, right: 26, borderRadius: 22, background: '#fff', padding: 26, display: 'flex', gap: 24, alignItems: 'center' }}>
        <PetIdAppIcon size={120} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 600, color: '#111', paddingBottom: 14, borderBottom: '1px solid #e5e5ea' }}>PetID</div>
          <div style={{ marginTop: 14, fontSize: 21, color: '#6b7280' }}>https://mipetid.pages.dev</div>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 400, left: 40, right: 40, fontSize: 21, lineHeight: 1.4, color: '#6b7280' }}>
        Se agregará un ícono a tu pantalla de inicio para acceder rápidamente a este sitio web.
      </div>
    </div>
  );
}

const INSTALL = { share: 40, sheet: 46, scrollFrom: 72, scrollTo: 100, row: 118, dialog: 130, add: 176, home: 186, icon: 200 };

export function InstallScene() {
  const frame = useCurrentFrame();
  const sheet = useSpring(INSTALL.sheet, { damping: 18 });
  const scroll = interpolate(frame, [INSTALL.scrollFrom, INSTALL.scrollTo], [0, LIST_SCROLL], { ...clamp, easing: easeInOut });
  const highlight = interpolate(frame, [INSTALL.row, INSTALL.row + 4, INSTALL.row + 14], [0, 1, 0.4], clamp);
  const dialog = useSpring(INSTALL.dialog, { damping: 18 });
  const home = interpolate(frame, [INSTALL.home, INSTALL.home + 12], [0, 1], clamp);
  const icon = useSpring(INSTALL.icon, { damping: 9 });
  const glow = frame > INSTALL.icon + 10 ? 0.6 + Math.sin((frame - INSTALL.icon) / 6) * 0.4 : 0;
  const rowY = SHEET_TOP + LIST_TOP + TARGET_ROW * ROW_H + ROW_H / 2 - LIST_SCROLL;
  return (
    <LightBackground>
      <Caption step={8} title="Agrégala a tu inicio" subtitle="En iPhone, desde Safari: Compartir → Agregar a inicio" />
      <Phone top={520} delay={-30}>
        {frame < INSTALL.home + 12 && (
          <>
            <SafariPage sharePressed={pressAt(frame, INSTALL.share)} />
            {frame >= INSTALL.sheet && frame < INSTALL.dialog + 20 && <ShareSheet enter={sheet} scroll={scroll} highlight={highlight} />}
            {frame >= INSTALL.dialog && <AddToHomeDialog enter={dialog} addPressed={pressAt(frame, INSTALL.add)} />}
          </>
        )}
        {frame >= INSTALL.home && (
          <div style={{ position: 'absolute', inset: 0, opacity: home, transform: `scale(${1.08 - home * 0.08})`, zIndex: 28 }}>
            <HomeScreen petId={frame >= INSTALL.icon ? icon : 0} glow={glow} />
          </div>
        )}
        <StatusBar light={frame >= INSTALL.home + 6} />
        <Tap x={TOOL_X[2]} y={TOOLBAR_Y} at={INSTALL.share} />
        <Tap x={SCREEN_W / 2} y={rowY} at={INSTALL.row} />
        <Tap x={530} y={112} at={INSTALL.add} />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 9 · Instalar en Android ──────────────────────────────────────────

const CHROME_BLUE = '#0b57d0';
const MENU_BTN = { x: 562, y: 116 };
const MENU = { top: 76, right: 12, width: 480, icons: 90, row: 76 };
const MENU_ITEMS: { icon: IconName; label: string }[] = [
  { icon: 'plus', label: 'Nueva pestaña' },
  { icon: 'history', label: 'Historial' },
  { icon: 'download', label: 'Descargas' },
  { icon: 'star', label: 'Favoritos' },
  { icon: 'share', label: 'Compartir…' },
  { icon: 'search', label: 'Buscar en la página' },
  { icon: 'squarePlus', label: 'Agregar a la pantalla principal' },
  { icon: 'monitor', label: 'Sitio de escritorio' },
];
const MENU_TARGET = 6;
const INSTALL_DIALOG = { top: 440, height: 360, btnRight: 36, btnBottom: 32, btnW: 160, btnH: 68 };

function ChromePage({ menuPressed }: { menuPressed: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f7f8f5', fontFamily: sans }}>
      <LandingMock offset={94} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 164, background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ position: 'absolute', left: 22, top: MENU_BTN.y - 22, color: '#444' }}><Icon name="home" size={44} width={2} /></div>
        <div style={{ position: 'absolute', left: 84, right: 150, top: MENU_BTN.y - 32, height: 64, borderRadius: 999, background: '#f1f3f4', display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', fontSize: 23, color: '#202124' }}>
          <Icon name="lock" size={20} stroke="#5f6368" width={2.4} /> mipetid.pages.dev
        </div>
        <div style={{ position: 'absolute', left: 476, top: MENU_BTN.y - 20, width: 40, height: 40, borderRadius: 8, border: '3px solid #444', boxSizing: 'border-box', display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 700, color: '#444' }}>1</div>
        <div style={{ position: 'absolute', left: MENU_BTN.x - 24, top: MENU_BTN.y - 24, color: '#444', transform: `scale(${menuPressed})` }}>
          <Icon name="moreVertical" size={48} width={3} />
        </div>
      </div>
    </div>
  );
}

function ChromeMenu({ enter, highlight }: { enter: number; highlight: number }) {
  const topIcons: IconName[] = ['chevronRight', 'star', 'download', 'lock'];
  return (
    <div style={{
      position: 'absolute', zIndex: 20, top: MENU.top, right: MENU.right, width: MENU.width, borderRadius: 20, background: '#fff', fontFamily: sans,
      boxShadow: '0 12px 40px -8px rgba(0,0,0,0.35)', overflow: 'hidden', opacity: enter, transform: `scale(${0.7 + enter * 0.3})`, transformOrigin: 'top right',
    }}>
      <div style={{ height: MENU.icons, display: 'flex', alignItems: 'center', justifyContent: 'space-around', borderBottom: '1px solid #e8eaed', color: '#444' }}>
        {topIcons.map((t) => <Icon key={t} name={t} size={36} width={2} />)}
      </div>
      {MENU_ITEMS.map((m, i) => (
        <div key={m.label} style={{
          height: MENU.row, display: 'flex', alignItems: 'center', gap: 22, padding: '0 26px', fontSize: 23, color: '#202124',
          fontWeight: i === MENU_TARGET ? 700 : 500, background: i === MENU_TARGET ? `rgba(26,126,104,${0.1 + highlight * 0.18})` : '#fff',
        }}>
          <Icon name={m.icon} size={32} stroke={i === MENU_TARGET ? color.brand : '#444'} width={2} />
          {m.label}
        </div>
      ))}
    </div>
  );
}

function InstallAppDialog({ enter, installPressed }: { enter: number; installPressed: number }) {
  const d = INSTALL_DIALOG;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 24, background: `rgba(0,0,0,${0.4 * enter})` }} />
      <div style={{
        position: 'absolute', zIndex: 25, top: d.top, left: 50, right: 50, height: d.height, borderRadius: 36, background: '#fff', fontFamily: sans,
        padding: 40, boxSizing: 'border-box', opacity: enter, transform: `scale(${0.9 + enter * 0.1})`,
      }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: '#202124' }}>Instalar app</div>
        <div style={{ marginTop: 30, display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ borderRadius: 999, overflow: 'hidden' }}><PetIdAppIcon size={92} /></div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#202124' }}>PetID</div>
            <div style={{ marginTop: 4, fontSize: 21, color: '#5f6368' }}>mipetid.pages.dev</div>
          </div>
        </div>
        <div style={{ position: 'absolute', right: d.btnRight + d.btnW + 16, bottom: d.btnBottom, height: d.btnH, display: 'grid', placeItems: 'center', padding: '0 20px', fontSize: 24, fontWeight: 700, color: CHROME_BLUE }}>Cancelar</div>
        <div style={{
          position: 'absolute', right: d.btnRight, bottom: d.btnBottom, width: d.btnW, height: d.btnH, borderRadius: 999, background: CHROME_BLUE, color: '#fff',
          display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700, transform: `scale(${installPressed})`,
        }}>Instalar</div>
      </div>
    </>
  );
}

const ANDROID = { menu: 40, open: 44, row: 92, dialog: 102, install: 148, home: 158, icon: 172 };

export function AndroidInstallScene() {
  const frame = useCurrentFrame();
  const menu = interpolate(frame, [ANDROID.open, ANDROID.open + 8], [0, 1], { ...clamp, easing: easeInOut });
  const menuOut = interpolate(frame, [ANDROID.row + 6, ANDROID.row + 12], [1, 0], clamp);
  const highlight = interpolate(frame, [ANDROID.row, ANDROID.row + 4, ANDROID.row + 14], [0, 1, 0.4], clamp);
  const dialog = useSpring(ANDROID.dialog, { damping: 18 });
  const home = interpolate(frame, [ANDROID.home, ANDROID.home + 12], [0, 1], clamp);
  const icon = useSpring(ANDROID.icon, { damping: 9 });
  const glow = frame > ANDROID.icon + 10 ? 0.6 + Math.sin((frame - ANDROID.icon) / 6) * 0.4 : 0;
  const rowY = MENU.top + MENU.icons + MENU_TARGET * MENU.row + MENU.row / 2;
  const d = INSTALL_DIALOG;
  return (
    <LightBackground>
      <Caption step={9} title="En Android también" subtitle="Desde Chrome: menú ⋮ → Agregar a la pantalla principal" />
      <Phone top={520} delay={-30} android>
        {frame < ANDROID.home + 12 && (
          <>
            <ChromePage menuPressed={pressAt(frame, ANDROID.menu)} />
            {frame >= ANDROID.open && frame < ANDROID.row + 12 && <ChromeMenu enter={frame < ANDROID.row + 6 ? menu : menuOut} highlight={highlight} />}
            {frame >= ANDROID.dialog && <InstallAppDialog enter={dialog} installPressed={pressAt(frame, ANDROID.install)} />}
          </>
        )}
        {frame >= ANDROID.home && (
          <div style={{ position: 'absolute', inset: 0, opacity: home, transform: `scale(${1.08 - home * 0.08})`, zIndex: 28 }}>
            <HomeScreen android petId={frame >= ANDROID.icon ? icon : 0} glow={glow} />
          </div>
        )}
        <StatusBar light={frame >= ANDROID.home + 6} />
        <Tap x={MENU_BTN.x} y={MENU_BTN.y} at={ANDROID.menu} />
        <Tap x={SCREEN_W - MENU.right - MENU.width / 2} y={rowY} at={ANDROID.row} />
        <Tap x={SCREEN_W - 50 - d.btnRight - d.btnW / 2} y={d.top + d.height - d.btnBottom - d.btnH / 2} at={ANDROID.install} />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 10 · Activar avisos ──────────────────────────────────────────────

const DASH = { card: 318, cardH: 374, button: 593, buttonH: 70, pet: 738, petEnabled: 394 };

function PetCardMock() {
  const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 999, fontSize: 17, fontWeight: 600 };
  return (
    <div style={{ borderRadius: 35, background: '#fff', overflow: 'hidden', padding: PAD, boxShadow: '0 0 0 1.5px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.05)' }}>
      <div style={{ display: 'flex', gap: 23 }}>
        <Img src={staticFile('max.jpg')} style={{ width: 139, height: 139, borderRadius: 23, objectFit: 'cover', objectPosition: '58% 40%', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 9 }}>
            <span style={{ ...pill, background: WEB.brand100, color: WEB.brand800 }}><span style={{ width: 9, height: 9, borderRadius: 999, background: WEB.brand800 }} /> Protegida</span>
            <span style={{ ...pill, background: '#f1f5f9', color: WEB.ink, fontWeight: 700, letterSpacing: 1.5 }}>PET-00001</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 700, color: WEB.ink }}>Max</div>
          <div style={{ fontSize: 20, color: WEB.muted }}>Perro · Labrador</div>
          <span style={{ ...pill, marginTop: 8, background: '#f1f5f9', color: '#334155' }}><Icon name="activity" size={18} width={2.2} /> 0 escaneos</span>
        </div>
      </div>
      <div style={{ marginTop: 23, fontSize: 17, color: WEB.muted }}>Aún no han escaneado su PetID</div>
      <div style={{ marginTop: 23, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <WebButton height={56} fontSize={20} style={{ borderRadius: 17 }}><Icon name="eye" size={22} width={2} /> Ver perfil</WebButton>
        <WebButton height={56} fontSize={20} style={{ borderRadius: 17 }}><Icon name="edit" size={22} width={2} /> Editar</WebButton>
      </div>
      <WebButton height={56} fontSize={20} style={{ marginTop: 12, borderRadius: 17, background: '#dc2626', color: '#fff', boxShadow: 'none' }}>
        <Icon name="alert" size={22} width={2} /> Marcar como perdida
      </WebButton>
      <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: WEB.brand700 }}><Icon name="qr" size={22} width={2} /> Mi PetID y QR</span>
        <span style={{ color: WEB.muted }}>Reportes</span>
      </div>
    </div>
  );
}

function Dashboard({ enabled, buttonPressed }: { enabled: number; buttonPressed: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: WEB.surface, fontFamily: sans, color: WEB.ink }}>
      <WebHeader>
        <div style={{ padding: '0 16px', fontSize: 21, fontWeight: 600, color: WEB.muted }}>Mis mascotas</div>
        <div style={{ padding: '0 12px', color: WEB.muted }}><Icon name="logout" size={25} width={2} /></div>
      </WebHeader>
      <div style={{ position: 'absolute', top: 196, left: PAD, right: PAD }}>
        <div style={{ fontSize: 35, fontWeight: 700, letterSpacing: -0.6 }}>Hola, María 🐾</div>
        <div style={{ marginTop: 4, fontSize: 23, color: WEB.muted }}>Tus mascotas protegidas con PetID.</div>
      </div>
      {enabled < 1 && (
        <div style={{
          position: 'absolute', top: DASH.card, left: PAD, right: PAD, height: DASH.cardH, borderRadius: 35, background: '#fff', padding: 29, boxSizing: 'border-box',
          boxShadow: '0 0 0 1.5px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.05)', opacity: 1 - enabled,
        }}>
          <div style={{ width: 69, height: 69, borderRadius: 23, background: WEB.brand50, color: WEB.brand700, display: 'grid', placeItems: 'center' }}><Icon name="bell" size={37} /></div>
          <div style={{ marginTop: 23, fontSize: 23, lineHeight: 1.5, fontWeight: 700 }}>Recibe un aviso cuando escaneen su placa</div>
          <div style={{ marginTop: 6, fontSize: 20, lineHeight: 1.5, color: WEB.muted }}>Te llega una notificación con la zona aproximada del escaneo, y el mapa exacto si la persona comparte su GPS.</div>
          <WebButton primary height={DASH.buttonH} style={{ position: 'absolute', left: 29, right: 29, top: DASH.button - DASH.card, transform: `scale(${buttonPressed})` }}>
            Activar avisos
          </WebButton>
        </div>
      )}
      {enabled > 0 && (
        <div style={{ position: 'absolute', top: DASH.card, left: PAD, right: PAD, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 10px', fontSize: 20, color: WEB.muted, opacity: enabled }}>
          <span style={{ color: color.brand, display: 'flex' }}><Icon name="bell" size={23} /></span>
          Avisos activados en este dispositivo.
          <span style={{ fontWeight: 600, color: '#475569' }}>Desactivar</span>
        </div>
      )}
      <div style={{ position: 'absolute', left: PAD, right: PAD, top: DASH.pet - enabled * (DASH.pet - DASH.petEnabled) }}>
        <PetCardMock />
      </div>
    </div>
  );
}

function PermissionAlert({ enter, allowPressed }: { enter: number; allowPressed: number }) {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, background: `rgba(0,0,0,${0.35 * enter})` }} />
      <div style={{
        position: 'absolute', zIndex: 31, top: 430, left: 70, right: 70, borderRadius: 30, background: 'rgba(242,242,247,0.97)', fontFamily: sans,
        textAlign: 'center', overflow: 'hidden', opacity: enter, transform: `scale(${1.15 - enter * 0.15})`,
      }}>
        <div style={{ padding: '32px 30px 26px' }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>"PetID" quiere enviarte notificaciones</div>
          <div style={{ marginTop: 12, fontSize: 20, lineHeight: 1.4, color: '#333' }}>Las notificaciones pueden incluir alertas, sonidos e indicadores. Puedes configurarlas en Ajustes.</div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid #c7c7cc', fontSize: 25 }}>
          <div style={{ flex: 1, padding: '24px 0', color: IOS_BLUE, borderRight: '1px solid #c7c7cc' }}>No permitir</div>
          <div style={{ flex: 1, padding: '24px 0', color: IOS_BLUE, fontWeight: 700, background: allowPressed < 1 ? '#dcdce1' : 'transparent' }}>Permitir</div>
        </div>
      </div>
    </>
  );
}

const NOTIFY = { openIcon: 28, app: 34, button: 84, alert: 92, allow: 146, done: 156 };

export function NotifyScene() {
  const frame = useCurrentFrame();
  const open = interpolate(frame, [NOTIFY.app, NOTIFY.app + 14], [0, 1], { ...clamp, easing: easeInOut });
  const alert = useSpring(NOTIFY.alert, { damping: 16 });
  const alertOut = interpolate(frame, [NOTIFY.allow + 6, NOTIFY.allow + 14], [1, 0], clamp);
  const enabled = useSpring(NOTIFY.done, { damping: 14 });
  const iconX = PETID_SLOT.x;
  const iconY = PETID_SLOT.y + HOME.icon / 2;
  return (
    <LightBackground>
      <Caption step={10} title="Activa los avisos" subtitle="Ábrela desde el ícono y toca Permitir" />
      <Phone top={520} delay={-30}>
        <HomeScreen petId={1} />
        {frame >= NOTIFY.app && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, overflow: 'hidden',
            clipPath: `inset(${(1 - open) * iconY}px ${(1 - open) * (SCREEN_W - iconX)}px ${(1 - open) * (SCREEN_H - iconY)}px ${(1 - open) * iconX}px round ${(1 - open) * 40 + 10}px)`,
          }}>
            <Dashboard enabled={frame >= NOTIFY.done ? enabled : 0} buttonPressed={pressAt(frame, NOTIFY.button)} />
          </div>
        )}
        {frame >= NOTIFY.alert && frame < NOTIFY.allow + 14 && (
          <PermissionAlert enter={frame < NOTIFY.allow + 6 ? alert : alertOut} allowPressed={pressAt(frame, NOTIFY.allow)} />
        )}
        <StatusBar light={frame < NOTIFY.app + 8} />
        <Tap x={iconX} y={iconY} at={NOTIFY.openIcon} />
        <Tap x={SCREEN_W / 2} y={DASH.button + DASH.buttonH / 2} at={NOTIFY.button} />
        <Tap x={SCREEN_W / 2 + 115} y={430 + 262} at={NOTIFY.allow} />
      </Phone>
    </LightBackground>
  );
}

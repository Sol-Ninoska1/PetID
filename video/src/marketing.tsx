import type { ReactNode } from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { BrandBackground, clamp, easeInOut, Icon, LightBackground, Logo, Phone, SCREEN_W, useSpring } from './components';
import { color, sans, type IconName } from './theme';

const PRICE = '$12.990';
const SITE = 'mipetid.pages.dev';
const METAL = 'radial-gradient(circle at 34% 28%, #ffffff 0%, #eef1f3 28%, #cfd5da 62%, #a9b2ba 100%)';
const ENGRAVE = '#1f2933';

// ─── Tag ────────────────────────────────────────────────────────────────────

function Sheen({ pos }: { pos: number }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none',
      background: 'linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.75) 50%, transparent 62%)',
      transform: `translateX(${pos * 100}%)`,
    }} />
  );
}

function Hole({ size }: { size: number }) {
  return (
    <div style={{
      position: 'absolute', left: '50%', top: size * 0.035, width: size * 0.07, height: size * 0.07, marginLeft: -size * 0.035, borderRadius: 999,
      background: 'radial-gradient(circle, #6b7280 0%, #9ca3af 60%, #e5e7eb 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
    }} />
  );
}

function TagFront({ size, sheen }: { size: number; sheen: number }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: 999, background: METAL, overflow: 'hidden', fontFamily: sans,
      boxShadow: 'inset 0 0 0 5px rgba(255,255,255,0.7), inset 0 -14px 34px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: size * 0.06, boxSizing: 'border-box',
    }}>
      <Hole size={size} />
      <div style={{ fontSize: size * 0.105, fontWeight: 800, letterSpacing: -1, color: ENGRAVE }}>Pet<span style={{ color: color.brand }}>ID</span></div>
      <Img src={staticFile('qr-demo-max.png')} style={{ width: size * 0.5, height: size * 0.5, marginTop: size * 0.015 }} />
      <div style={{ marginTop: size * 0.035, fontSize: size * 0.04, fontWeight: 700, color: '#374151' }}>Si me encuentras, escanéame</div>
      <Sheen pos={sheen} />
    </div>
  );
}

function TagBack({ size, sheen }: { size: number; sheen: number }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: 999, background: METAL, overflow: 'hidden', fontFamily: sans,
      boxShadow: 'inset 0 0 0 5px rgba(255,255,255,0.7), inset 0 -14px 34px rgba(0,0,0,0.18)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: size * 0.03,
    }}>
      <Hole size={size} />
      <div style={{ width: size * 0.34, height: size * 0.34, borderRadius: size * 0.09, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center' }}>
        <Icon name="paw" size={size * 0.2} />
      </div>
      <div style={{ fontSize: size * 0.06, fontWeight: 800, color: ENGRAVE }}>Escanéame 📲</div>
      <div style={{ fontSize: size * 0.038, fontWeight: 600, color: '#4b5563' }}>{SITE}</div>
      <Sheen pos={sheen} />
    </div>
  );
}

/** 3D metal tag; `angle` is the Y rotation in degrees (0 = QR facing the camera). */
export function Tag3D({ size, angle, swing = 0 }: { size: number; angle: number; swing?: number }) {
  const sheen = Math.sin((angle * Math.PI) / 180) * 1.2;
  const thickness = 12;
  return (
    <div style={{ position: 'relative', width: size, height: size + size * 0.2, transformOrigin: `50% 0`, transform: `rotate(${swing}deg)` }}>
      <div style={{
        position: 'absolute', left: '50%', top: 0, width: size * 0.2, height: size * 0.2, marginLeft: -size * 0.1, borderRadius: 999,
        border: `${size * 0.026}px solid #b9c1c8`, boxSizing: 'border-box', boxShadow: 'inset 0 0 0 2px #eef1f3, 0 2px 4px rgba(0,0,0,0.2)', zIndex: 2,
      }} />
      <div style={{ position: 'absolute', top: size * 0.17, left: 0, perspective: 2000 }}>
        <div style={{ position: 'relative', width: size, height: size, transformStyle: 'preserve-3d', transform: `rotateY(${angle}deg)` }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#9aa3ab', transform: `translateZ(${-thickness / 2 + (i * thickness) / 9}px)` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: `translateZ(${thickness / 2 + 0.5}px)` }}>
            <TagFront size={size} sheen={sheen} />
          </div>
          <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: `rotateY(180deg) translateZ(${thickness / 2 + 0.5}px)` }}>
            <TagBack size={size} sheen={-sheen} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Strap({ top }: { top: number }) {
  return (
    <>
      <div style={{
        position: 'absolute', left: -40, right: -40, top, height: 120, background: 'linear-gradient(180deg, #2b2f36, #111317 55%, #22262c)',
        boxShadow: '0 20px 40px -18px rgba(0,0,0,0.55)', transform: 'rotate(-3deg)',
      }}>
        {[26, 94].map((y) => (
          <div key={y} style={{ position: 'absolute', left: 0, right: 0, top: y, height: 0, borderTop: '5px dashed rgba(255,255,255,0.75)' }} />
        ))}
      </div>
      <div style={{
        position: 'absolute', left: 540 - 55, top: top + 70, width: 110, height: 100, borderRadius: '0 0 60px 60px',
        border: '14px solid #b9c1c8', borderTop: 'none', boxSizing: 'border-box', boxShadow: 'inset 0 -2px 0 #eef1f3',
      }} />
    </>
  );
}

// ─── Video: spinning tag (1080×1080) ────────────────────────────────────────

export const SPIN_FRAMES = 300;

export function TagSpin() {
  const frame = useCurrentFrame();
  const drop = useSpring(0, { damping: 11 });
  const spin = interpolate(frame, [10, 175], [0, 1080], { ...clamp, easing: easeInOut });
  const wobble = frame > 175 ? Math.sin((frame - 175) / 14) * 10 * Math.exp(-(frame - 175) / 40) : 0;
  const swing = Math.sin(frame / 22) * 2.5;
  const hook = interpolate(frame, [14, 30, 160, 176], [0, 1, 1, 0], clamp);
  const info = useSpring(185, { damping: 14 });
  const sweep = interpolate(frame, [200, 236], [0, 1], clamp);
  const cta = useSpring(250, { damping: 14 });
  const size = 470;
  return (
    <LightBackground>
      <div style={{ position: 'absolute', left: 540 - size / 2, top: 205 + (1 - drop) * -300 }}>
        <Tag3D size={size} angle={spin + wobble} swing={swing} />
        {sweep > 0 && sweep < 1 && (
          <div style={{
            position: 'absolute', left: size * 0.22, right: size * 0.22, top: size * 0.17 + size * 0.24 + sweep * size * 0.52, height: 6, borderRadius: 3,
            background: color.mint, boxShadow: `0 0 30px 10px ${color.mint}`,
          }} />
        )}
      </div>
      <Strap top={70} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', fontFamily: sans }}>
        <div style={{ opacity: hook, transform: `translateY(${(1 - hook) * 30}px)`, fontSize: 60, fontWeight: 800, color: color.ink, letterSpacing: -1.5 }}>
          ¿Y si tu mascota se <span style={{ color: color.coral }}>pierde</span>?
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', fontFamily: sans, opacity: info * (1 - cta), transform: `translateY(${(1 - info) * 40}px)` }}>
        <div style={{ fontSize: 58, fontWeight: 800, color: color.ink, letterSpacing: -1.5 }}>Placa QR PetID</div>
        <div style={{ marginTop: 10, fontSize: 32, fontWeight: 600, color: color.muted }}>Te avisa al celular cuando la escanean 📲</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 850, textAlign: 'center', fontFamily: sans, opacity: cta, transform: `scale(${0.9 + cta * 0.1})` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22, padding: '18px 36px', borderRadius: 999, background: color.brand, color: '#fff', fontSize: 50, fontWeight: 800 }}>
          {PRICE} <span style={{ fontSize: 30, fontWeight: 600, opacity: 0.85 }}>incluye 1 año</span>
        </div>
        <div style={{ marginTop: 20, fontSize: 32, fontWeight: 700, color: color.ink }}>Pídela por mensaje 💬 · {SITE}</div>
      </div>
    </LightBackground>
  );
}

// ─── Stills (1080×1080) ─────────────────────────────────────────────────────

function Chip({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 12, padding: '16px 26px', borderRadius: 999, fontSize: 30, fontWeight: 700,
      background: light ? 'rgba(255,255,255,0.16)' : '#fff', color: light ? '#fff' : color.ink,
      border: light ? '2px solid rgba(255,255,255,0.25)' : `2px solid ${color.line}`,
    }}>{children}</span>
  );
}

export function MarketCover() {
  return (
    <BrandBackground>
      <div style={{ position: 'absolute', top: 70, left: 70, right: 70, textAlign: 'center', color: '#fff', fontFamily: sans, fontSize: 86, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>
        ¿Y si tu mascota se <span style={{ color: '#ffb4a9' }}>pierde</span>?
      </div>
      <div style={{ position: 'absolute', left: 540 - 200, top: 300 }}>
        <Tag3D size={400} angle={-16} swing={-4} />
      </div>
      <div style={{ position: 'absolute', left: 50, right: 50, bottom: 60, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>
        <Chip light>📲 Te avisa al celular</Chip>
        <Chip light>📍 Ubicación</Chip>
        <Chip light>🔋 Sin apps ni batería</Chip>
      </div>
    </BrandBackground>
  );
}

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'camera', title: 'Escanean la placa', text: 'Con la cámara del celular, sin apps' },
  { icon: 'eye', title: 'Ven su perfil', text: 'Foto, nombre y cómo contactarte' },
  { icon: 'phone', title: 'Te contactan', text: 'Llamada o WhatsApp en un toque' },
  { icon: 'bell', title: 'Te llega un aviso', text: 'Con la zona donde la escanearon' },
];

export function MarketSteps() {
  return (
    <LightBackground>
      <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: sans }}>
        <Logo size={0.5} />
        <div style={{ marginTop: 26, fontSize: 76, fontWeight: 800, letterSpacing: -2.5, color: color.ink }}>¿Cómo funciona?</div>
      </div>
      <div style={{ position: 'absolute', top: 330, left: 60, right: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, fontFamily: sans }}>
        {STEPS.map((s, i) => (
          <div key={s.title} style={{ borderRadius: 36, background: '#fff', padding: 34, boxShadow: '0 20px 50px -24px rgba(15,23,42,0.25)', border: `2px solid ${color.line}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 76, height: 76, borderRadius: 24, background: color.brandLight, color: color.brandDark, display: 'grid', placeItems: 'center' }}>
                <Icon name={s.icon} size={40} />
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: color.brand }}>Paso {i + 1}</div>
            </div>
            <div style={{ marginTop: 22, fontSize: 36, fontWeight: 800, color: color.ink, letterSpacing: -0.5 }}>{s.title}</div>
            <div style={{ marginTop: 8, fontSize: 26, lineHeight: 1.35, color: color.muted }}>{s.text}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', fontFamily: sans, fontSize: 32, fontWeight: 700, color: color.ink }}>
        Incluye 1 año de servicio · Sin mensualidades
      </div>
    </LightBackground>
  );
}

export function MarketCollar() {
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f1f8f5 100%)', fontFamily: sans }}>
      <Img src={staticFile('collar-tag.png')} style={{ position: 'absolute', left: 120, top: 40, width: 840, mixBlendMode: 'multiply' }} />
      <div style={{ position: 'absolute', left: 60, right: 60, bottom: 70, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
        <Chip>🔳 QR único</Chip>
        <Chip>💚 Perfil editable</Chip>
        <Chip>📲 Aviso al celular</Chip>
        <Chip>🔋 Sin apps ni batería</Chip>
      </div>
      <div style={{ position: 'absolute', right: 30, bottom: 22, fontSize: 18, color: '#94a3b8' }}>Imagen referencial</div>
    </AbsoluteFill>
  );
}

export function MarketScan() {
  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      <Img src={staticFile('perro-escaneo.png')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260, background: 'linear-gradient(rgba(11,70,56,0.85), rgba(11,70,56,0))' }} />
      <div style={{ position: 'absolute', top: 50, left: 60, right: 60, textAlign: 'center', color: '#fff', fontSize: 64, fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        La escanean y <span style={{ color: '#a7f3d0' }}>te avisan</span> 📲
      </div>
      <div style={{ position: 'absolute', right: 24, bottom: 18, fontSize: 18, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>Imagen referencial</div>
    </AbsoluteFill>
  );
}

export function MarketProfile() {
  return (
    <LightBackground>
      <div style={{ position: 'absolute', top: 90, left: 60, width: 420, fontFamily: sans }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: color.coral }}>🚨 Si se pierde</div>
        <div style={{ marginTop: 14, fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5, color: color.ink }}>Así verán su perfil</div>
        <div style={{ marginTop: 22, fontSize: 30, lineHeight: 1.4, color: color.muted }}>Quien la encuentre te llama, te escribe o te envía su ubicación en un toque.</div>
        <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
          <Chip>📞 Llamar</Chip>
          <Chip>💬 WhatsApp</Chip>
          <Chip>📍 Enviar ubicación</Chip>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 520, top: 70, width: SCREEN_W + 36, transform: 'scale(0.78) rotate(4deg)', transformOrigin: 'top left' }}>
        <Phone top={0} delay={-60} style={{ left: 0 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgb(232,237,241)' }}>
            <Img src={staticFile('profile.png')} style={{ position: 'absolute', left: 0, top: 70, width: SCREEN_W }} />
          </div>
        </Phone>
      </div>
    </LightBackground>
  );
}

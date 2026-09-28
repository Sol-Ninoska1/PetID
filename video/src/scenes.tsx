import type { CSSProperties } from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  BrandBackground, Caption, clamp, Headline, Icon, LightBackground, Logo, Phone, SCREEN_H, SCREEN_W, SequenceFrom, StatusBar, Tap, useSpring,
} from './components';
import { color, sans } from './theme';

// ─── 1. Hook ────────────────────────────────────────────────────────────────

export function HookScene() {
  const frame = useCurrentFrame();
  const photo = useSpring(0, { damping: 12 });
  const l1 = useSpring(10);
  const l2 = useSpring(18);
  const pill = useSpring(42);
  const bubble = useSpring(26, { damping: 8 });
  return (
    <BrandBackground>
      <div style={{ position: 'absolute', left: 350, top: 300, width: 380, height: 380, transform: `scale(${photo}) rotate(${Math.sin(frame / 18) * 3}deg)` }}>
        <div style={{ width: '100%', height: '100%', borderRadius: 999, padding: 8, background: 'linear-gradient(135deg,#f1e3bd,#d9bd85,#b8955a)', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)' }}>
          <Img src={staticFile('max.jpg')} style={{ width: '100%', height: '100%', borderRadius: 999, objectFit: 'cover', objectPosition: '58% 45%', border: '8px solid #fff', boxSizing: 'border-box' }} />
        </div>
        <div style={{
          position: 'absolute', right: -30, top: 0, width: 120, height: 120, borderRadius: 999, background: color.coral,
          display: 'grid', placeItems: 'center', color: '#fff', fontSize: 80, fontWeight: 800, fontFamily: sans,
          transform: `scale(${bubble})`, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
        }}>?</div>
      </div>
      <div style={{ position: 'absolute', top: 820, left: 60, right: 60, textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: 112, lineHeight: 1.05, letterSpacing: -3 }}>
        <div style={{ opacity: l1, transform: `translateY(${(1 - l1) * 60}px)` }}>¿Y si tu mascota</div>
        <div style={{ opacity: l2, transform: `translateY(${(1 - l2) * 60}px)` }}>
          se <span style={{ color: '#ffb4a9' }}>pierde</span>?
        </div>
      </div>
      <div style={{ position: 'absolute', top: 1200, width: '100%', textAlign: 'center', opacity: pill, transform: `translateY(${(1 - pill) * 30}px)` }}>
        <span style={{ display: 'inline-block', padding: '22px 44px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 44, fontWeight: 700 }}>
          Así funciona PetID 👇
        </span>
      </div>
    </BrandBackground>
  );
}

// ─── 2. The collar ──────────────────────────────────────────────────────────

const BOX = { w: 880, h: 800, left: 100, top: 640 };
const TAG = { x: 496, y: 642 };

export function CollarScene() {
  const frame = useCurrentFrame();
  const enter = useSpring(6, { damping: 13 });
  const swap = interpolate(frame, [60, 82], [0, 1], clamp);
  const zoom = interpolate(frame, [150, 190], [1, 1.35], { ...clamp, easing: (t) => t * t });
  const ring = interpolate(frame, [84, 120], [0, 1], clamp);
  const chips = ['🔳 QR único', '✍️ Tú la activas', '🔋 Sin batería'];
  const img: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' };
  return (
    <LightBackground>
      <Caption title="Tu placa llega así" subtitle="Solo con su código QR. Los datos los completas tú" />
      <div style={{
        position: 'absolute', left: BOX.left, top: BOX.top, width: BOX.w, height: BOX.h, opacity: enter,
        mixBlendMode: 'multiply', transformOrigin: `${TAG.x}px ${TAG.y}px`,
        transform: `translateY(${Math.sin(frame / 20) * 12}px) rotate(${Math.sin(frame / 32) * 1.5}deg) scale(${(0.6 + enter * 0.4) * zoom})`,
      }}>
        <Img src={staticFile('collar.png')} style={{ ...img, opacity: 1 - swap }} />
        <Img src={staticFile('collar-tag.png')} style={{ ...img, opacity: swap }} />
        {ring > 0 && ring < 1 && (
          <div style={{
            position: 'absolute', left: TAG.x - 130, top: TAG.y - 130, width: 260, height: 260, borderRadius: 999,
            border: `8px solid ${color.brand}`, opacity: 1 - ring, transform: `scale(${1 + ring * 0.8})`,
          }} />
        )}
      </div>
      <div style={{ position: 'absolute', top: 1620, width: '100%', display: 'flex', justifyContent: 'center', gap: 18 }}>
        {chips.map((c, i) => {
          const s = interpolate(frame, [96 + i * 8, 110 + i * 8], [0, 1], clamp);
          return (
            <span key={c} style={{
              padding: '18px 28px', borderRadius: 999, background: '#fff', border: `2px solid ${color.line}`,
              fontSize: 32, fontWeight: 700, color: color.ink, opacity: s * (1 - interpolate(frame, [150, 170], [0, 1], clamp)),
              transform: `translateY(${(1 - s) * 30}px)`, boxShadow: '0 10px 30px -12px rgba(15,23,42,0.2)',
            }}>{c}</span>
          );
        })}
      </div>
    </LightBackground>
  );
}

// ─── 3. Scanning ────────────────────────────────────────────────────────────

const SCALE = 1.77;
const FRAME_BOX = { x: 110, y: 400, s: 380 };

export function ScanScene() {
  const frame = useCurrentFrame();
  const focus = useSpring(4, { damping: 20 });
  const blur = interpolate(frame, [4, 32], [12, 0], clamp);
  const brackets = useSpring(30, { damping: 11 });
  const sweep = interpolate(frame, [42, 82], [0, 1], clamp);
  const pill = useSpring(88, { damping: 12 });
  const leave = interpolate(frame, [142, 162], [0, 1], clamp);
  const shakeX = Math.sin(frame / 7) * 5 + Math.sin(frame / 3.3) * 2;
  const shakeY = Math.cos(frame / 9) * 5;
  const imgW = 785 * SCALE;
  const imgH = 723 * SCALE;
  const cx = FRAME_BOX.x + FRAME_BOX.s / 2;
  const cy = FRAME_BOX.y + FRAME_BOX.s / 2;
  const corner = (rot: number, x: number, y: number) => (
    <div style={{
      position: 'absolute', left: x - 35, top: y - 35, width: 70, height: 70,
      borderLeft: '9px solid #ffd60a', borderTop: '9px solid #ffd60a', borderTopLeftRadius: 22, transform: `rotate(${rot}deg)`,
    }} />
  );
  return (
    <LightBackground>
      <Caption step={1} title="Escanea la placa" subtitle="La primera vez se abre la activación" />
      <Phone top={520}>
        <div style={{ position: 'absolute', inset: 0, background: '#fff' }}>
          <Img src={staticFile('collar-tag.png')} style={{
            position: 'absolute', width: imgW, height: imgH,
            left: cx - 443 * SCALE + shakeX, top: cy - 580 * SCALE + shakeY,
            transformOrigin: `${443 * SCALE}px ${580 * SCALE}px`, transform: `scale(${0.8 + focus * 0.2})`, filter: `blur(${blur}px)`,
          }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 150, background: 'linear-gradient(rgba(0,0,0,0.55), transparent)' }} />
          <div style={{
            position: 'absolute', left: FRAME_BOX.x, top: FRAME_BOX.y, width: FRAME_BOX.s, height: FRAME_BOX.s,
            opacity: brackets, transform: `scale(${1.4 - brackets * 0.4})`,
          }}>
            {corner(0, 35, 35)}{corner(90, FRAME_BOX.s - 35, 35)}{corner(270, 35, FRAME_BOX.s - 35)}{corner(180, FRAME_BOX.s - 35, FRAME_BOX.s - 35)}
            {sweep > 0 && sweep < 1 && (
              <div style={{
                position: 'absolute', left: 20, right: 20, top: 20 + sweep * (FRAME_BOX.s - 40), height: 6, borderRadius: 3,
                background: color.mint, boxShadow: `0 0 30px 10px ${color.mint}`, opacity: 0.9,
              }} />
            )}
          </div>
          <div style={{
            position: 'absolute', left: 60, right: 60, top: 850, display: 'flex', alignItems: 'center', gap: 16,
            padding: '20px 26px', borderRadius: 26, background: '#ffd60a', color: '#111', fontFamily: sans,
            opacity: pill, transform: `translateY(${(1 - pill) * 60}px) scale(${0.9 + pill * 0.1})`, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)',
          }}>
            <Icon name="link" size={36} width={2.6} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>Abrir perfil PetID</div>
              <div style={{ fontSize: 20, fontWeight: 600, opacity: 0.7 }}>Placa PET-00001</div>
            </div>
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 230, background: 'rgba(0,0,0,0.85)', fontFamily: sans }}>
            <div style={{ textAlign: 'center', marginTop: 22, color: '#ffd60a', fontSize: 22, fontWeight: 700, letterSpacing: 2 }}>FOTO</div>
            <div style={{ position: 'absolute', left: '50%', top: 80, width: 110, height: 110, marginLeft: -55, borderRadius: 999, border: '6px solid #fff', boxSizing: 'border-box', padding: 6 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: 999, background: '#fff' }} />
            </div>
          </div>
          <StatusBar light />
          <Tap x={SCREEN_W / 2} y={895} at={130} />
          <div style={{ position: 'absolute', inset: 0, background: color.surface, opacity: leave, display: 'grid', placeItems: 'center' }}>
            <div style={{ transform: `scale(${0.8 + leave * 0.2})` }}><Logo size={0.6} /></div>
          </div>
        </div>
      </Phone>
    </LightBackground>
  );
}

// ─── Public profile ──────────────────────────────────────────────────────

const PROFILE_TOP = 70;
const PROFILE_H = Math.round((3700 * SCREEN_W) / 1344);
const PROFILE_SCROLL = PROFILE_TOP + PROFILE_H - SCREEN_H;

export function ProfileScene() {
  const frame = useCurrentFrame();
  const toast = useSpring(182, { damping: 13 });
  const scroll = interpolate(frame, [128, 160], [0, PROFILE_SCROLL], { ...clamp, easing: (t) => (1 - Math.cos(Math.PI * t)) / 2 });
  const pulse = (at: number) => interpolate(frame, [at - 2, at + 4, at + 12], [1, 0.95, 1], clamp);
  return (
    <LightBackground>
      <Caption badge="Si se pierde" title="Escanean su placa" subtitle="Ven su perfil y te contactan al instante" />
      <Phone top={520} delay={-30}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: PROFILE_TOP + PROFILE_H, background: 'rgb(232,237,241)', transform: `translateY(${-scroll}px)` }}>
          <Img src={staticFile('profile.png')} style={{ position: 'absolute', left: 0, top: PROFILE_TOP, width: SCREEN_W, height: PROFILE_H }} />
          <HighlightButton x={26} y={562} w={550} h={83} scale={pulse(60)} at={60} />
          <HighlightButton x={310} y={665} w={266} h={85} scale={pulse(112)} at={112} />
          <Tap x={300} y={604} at={60} />
          <Tap x={442} y={708} at={112} />
          <Tap x={300} y={801} at={172} />
        </div>
        <StatusBar />
        <div style={{
          position: 'absolute', left: 30, right: 30, top: 100, padding: '24px 28px', borderRadius: 26, background: color.ink, color: '#fff',
          fontFamily: sans, fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 16, zIndex: 46,
          opacity: toast, transform: `translateY(${(1 - toast) * -80}px)`, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4)',
        }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 999, background: color.brand }}><Icon name="check" size={30} width={3} /></span>
          Ubicación enviada al dueño
        </div>
      </Phone>
    </LightBackground>
  );
}

function HighlightButton({ x, y, w, h, scale, at }: { x: number; y: number; w: number; h: number; scale: number; at: number }) {
  const frame = useCurrentFrame();
  const glow = interpolate(frame, [at - 16, at, at + 20], [0, 1, 0], clamp);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 22,
      boxShadow: `0 0 0 ${6 * glow}px rgba(255,214,10,${glow})`, transform: `scale(${scale})`,
    }} />
  );
}

// ─── Owner alert ─────────────────────────────────────────────────────────

function Notification({ top, delay, title, body }: { top: number; delay: number; title: string; body: string }) {
  const s = useSpring(delay, { damping: 14 });
  return (
    <div style={{
      position: 'absolute', left: 20, right: 20, top, padding: '22px 24px', borderRadius: 34,
      background: 'rgba(245,245,247,0.86)', backdropFilter: 'blur(20px)', fontFamily: sans,
      display: 'flex', gap: 18, opacity: s, transform: `translateY(${(1 - s) * -120}px) scale(${0.9 + s * 0.1})`,
      boxShadow: '0 20px 40px -16px rgba(0,0,0,0.45)',
    }}>
      <div style={{ width: 70, height: 70, flexShrink: 0, borderRadius: 18, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center' }}>
        <Icon name="paw" size={40} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, color: '#6b7280' }}>
          <span>PETID</span><span style={{ fontWeight: 500 }}>ahora</span>
        </div>
        <div style={{ marginTop: 4, fontSize: 25, fontWeight: 800, color: '#111' }}>{title}</div>
        <div style={{ marginTop: 2, fontSize: 23, color: '#374151' }}>{body}</div>
      </div>
    </div>
  );
}

function MapView() {
  const frame = useCurrentFrame();
  const drop = useSpring(6, { damping: 9 });
  const sheet = useSpring(18, { damping: 15 });
  const pulse = (frame % 40) / 40;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#e9efe7', fontFamily: sans }}>
      <svg width={SCREEN_W} height={SCREEN_H} style={{ position: 'absolute', inset: 0 }}>
        <rect x={360} y={120} width={260} height={220} rx={20} fill="#cfe8c6" />
        <rect x={-20} y={640} width={220} height={260} rx={20} fill="#cfe8c6" />
        <path d="M-50 1000 C 200 900, 350 1100, 700 950 L700 1300 L-50 1300 Z" fill="#bfdcf2" />
        <g stroke="#fff" strokeLinecap="round" fill="none">
          <path d="M-40 420 L 660 560" strokeWidth={38} />
          <path d="M180 -40 L 300 1300" strokeWidth={30} />
          <path d="M-40 780 L 660 700" strokeWidth={22} />
          <path d="M470 -40 L 420 1300" strokeWidth={18} />
          <path d="M-40 220 L 660 260" strokeWidth={16} />
        </g>
        <text x={330} y={512} fontSize={20} fontWeight={700} fill="#94a3b8" transform="rotate(11 330 512)">Av. Providencia</text>
      </svg>
      <div style={{ position: 'absolute', left: 250, top: 470 }}>
        <div style={{ position: 'absolute', left: 50 - 80, top: 100 - 30, width: 160, height: 60, borderRadius: '50%', background: 'rgba(239,107,91,0.35)', transform: `scale(${0.5 + pulse})`, opacity: 1 - pulse }} />
        <div style={{ transform: `translateY(${(1 - drop) * -300}px)` }}>
          <Icon name="mapPin" size={100} stroke="#fff" width={1.6} style={{ fill: color.coral, filter: 'drop-shadow(0 10px 12px rgba(0,0,0,0.35))' }} />
          <Img src={staticFile('max.jpg')} style={{ position: 'absolute', left: 30, top: 18, width: 40, height: 40, borderRadius: 999, objectFit: 'cover', objectPosition: '58% 45%' }} />
        </div>
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, borderRadius: '44px 44px 0 0', background: '#fff',
        padding: '40px 40px 0', boxShadow: '0 -20px 40px -20px rgba(15,23,42,0.25)', transform: `translateY(${(1 - sheet) * 380}px)`,
      }}>
        <div style={{ margin: '-20px auto 26px', width: 70, height: 7, borderRadius: 4, background: color.line }} />
        <div style={{ fontSize: 34, fontWeight: 800, color: color.ink }}>Max fue visto aquí</div>
        <div style={{ marginTop: 6, fontSize: 24, color: color.muted }}>Cerca de Av. Providencia · hace 1 min</div>
        <div style={{ marginTop: 30, height: 90, borderRadius: 22, background: color.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, fontSize: 28, fontWeight: 800 }}>
          <Icon name="navigation" size={30} width={2.4} /> Cómo llegar
        </div>
      </div>
    </div>
  );
}

export function AlertScene() {
  const frame = useCurrentFrame();
  const map = interpolate(frame, [124, 140], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <LightBackground>
      <Caption badge="Si se pierde" title="Te llega un aviso" subtitle="Con la ubicación donde escanearon su placa" />
      <Phone top={520} delay={-30}>
        <Img src={staticFile('max.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '58% center', filter: 'brightness(0.72)' }} />
        <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', color: '#fff', fontFamily: sans }}>
          <div style={{ fontSize: 28, fontWeight: 600 }}>domingo, 27 de septiembre</div>
          <div style={{ fontSize: 150, fontWeight: 700, lineHeight: 1, letterSpacing: -4 }}>16:42</div>
        </div>
        <Notification top={400} delay={18} title="🐾 Escanearon la placa de Max" body="Cerca de Providencia, Santiago" />
        <Notification top={570} delay={66} title="📍 Te enviaron su ubicación" body="Toca para ver el mapa" />
        {frame < 132 && <StatusBar light />}
        <Tap x={SCREEN_W / 2} y={640} at={118} />
        {frame >= 124 && (
          <div style={{ position: 'absolute', inset: 0, transform: `translateY(${(1 - map) * SCREEN_H}px)`, zIndex: 20 }}>
            <SequenceFrom from={124}><MapView /></SequenceFrom>
            <StatusBar />
          </div>
        )}
      </Phone>
    </LightBackground>
  );
}

// ─── Outro ───────────────────────────────────────────────────────────────

export function OutroScene() {
  const frame = useCurrentFrame();
  const collar = useSpring(0, { damping: 12 });
  const logo = useSpring(16, { damping: 12 });
  const tagline = useSpring(30);
  const pill = useSpring(44);
  return (
    <BrandBackground>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <div style={{ marginTop: 260, width: 700, height: 645, opacity: collar, transform: `scale(${0.7 + collar * 0.3}) translateY(${Math.sin(frame / 18) * 12}px) rotate(${Math.sin(frame / 26) * 2}deg)` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 60, background: '#fff', padding: 30, boxSizing: 'border-box', boxShadow: '0 50px 100px -30px rgba(0,0,0,0.55)' }}>
            <Img src={staticFile('collar-tag.png')} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        <div style={{ marginTop: 110, opacity: logo, transform: `scale(${0.7 + logo * 0.3})` }}><Logo light /></div>
        <Headline style={{ marginTop: 40, fontSize: 70, color: '#fff', opacity: tagline, transform: `translateY(${(1 - tagline) * 30}px)` }}>
          Que siempre vuelva a casa
        </Headline>
        <div style={{ marginTop: 50, opacity: pill, transform: `translateY(${(1 - pill) * 30}px)`, padding: '20px 40px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 36, fontWeight: 700 }}>
          Escanea · Activa · Protege
        </div>
      </AbsoluteFill>
    </BrandBackground>
  );
}

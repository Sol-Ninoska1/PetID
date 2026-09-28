import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import type { ComponentType } from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { BrandBackground, clamp, easeInOut, Icon, LightBackground, Logo, useSpring } from './components';
import { Tag3D } from './marketing';
import { HookScene, ProfileScene } from './scenes';
import { color, sans } from './theme';

function ScanPhoto() {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 130], [1, 1.12], clamp);
  const text = useSpring(8);
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: sans }}>
      <Img src={staticFile('perro-escaneo.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`, transformOrigin: '50% 65%' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 560, background: 'linear-gradient(rgba(11,70,56,0.9), rgba(11,70,56,0))' }} />
      <div style={{
        position: 'absolute', top: 150, left: 70, right: 70, textAlign: 'center', color: '#fff', fontSize: 88, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5,
        opacity: text, transform: `translateY(${(1 - text) * 40}px)`, textShadow: '0 4px 24px rgba(0,0,0,0.3)',
      }}>
        Quien la encuentre <span style={{ color: '#a7f3d0' }}>escanea su placa</span>
      </div>
      <div style={{ position: 'absolute', right: 30, bottom: 30, fontSize: 24, color: 'rgba(255,255,255,0.8)' }}>Imagen referencial</div>
    </AbsoluteFill>
  );
}

function ScanAlert() {
  const card = useSpring(14, { damping: 13 });
  const text = useSpring(30);
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: sans }}>
      <Img src={staticFile('perro-escaneo.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(18px) brightness(0.55)', transform: 'scale(1.15)' }} />
      <div style={{ position: 'absolute', top: 170, width: '100%', textAlign: 'center', color: '#fff', fontSize: 150, fontWeight: 300, letterSpacing: -4 }}>9:41</div>
      <div style={{
        position: 'absolute', top: 470, left: 50, right: 50, padding: '34px 36px', borderRadius: 44, background: 'rgba(245,245,247,0.92)',
        display: 'flex', gap: 26, alignItems: 'center', opacity: card, transform: `translateY(${(1 - card) * -160}px) scale(${0.92 + card * 0.08})`,
        boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)',
      }}>
        <div style={{ width: 100, height: 100, borderRadius: 24, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="paw" size={56} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, color: '#6b7280', fontWeight: 600 }}><span>PetID</span><span>ahora</span></div>
          <div style={{ marginTop: 6, fontSize: 36, fontWeight: 800, color: '#111' }}>🐾 Escanearon la placa de Max</div>
          <div style={{ marginTop: 6, fontSize: 30, color: '#374151' }}>Cerca de Av. Providencia · Toca para ver el mapa</div>
        </div>
      </div>
      <div style={{
        position: 'absolute', top: 1180, left: 70, right: 70, textAlign: 'center', color: '#fff', fontSize: 92, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5,
        opacity: text, transform: `translateY(${(1 - text) * 40}px)`,
      }}>
        Y te llega un aviso <span style={{ color: '#a7f3d0' }}>al instante</span> 📲
      </div>
    </AbsoluteFill>
  );
}

function ProfileShort() {
  return (
    <Sequence from={-20}>
      <ProfileScene />
    </Sequence>
  );
}

const FEATURES = ['🔳 QR único', '💚 Perfil editable', '🔋 Sin apps ni batería', '💰 1 año incluido, sin mensualidad'];

function TagFeatures() {
  const frame = useCurrentFrame();
  const title = useSpring(4);
  const spin = interpolate(frame, [0, 110], [-200, 0], { ...clamp, easing: easeInOut });
  return (
    <LightBackground>
      <div style={{ position: 'absolute', top: 150, width: '100%', textAlign: 'center', fontFamily: sans, fontSize: 96, fontWeight: 800, letterSpacing: -3, color: color.ink, opacity: title }}>
        Placa QR <span style={{ color: color.brand }}>PetID</span>
      </div>
      <div style={{ position: 'absolute', left: 540 - 280, top: 340 }}>
        <Tag3D size={560} angle={spin} swing={Math.sin(frame / 22) * 2.5} />
      </div>
      <div style={{ position: 'absolute', top: 1140, left: 90, right: 90, display: 'flex', flexDirection: 'column', gap: 22, fontFamily: sans }}>
        {FEATURES.map((f, i) => {
          const s = interpolate(frame, [40 + i * 12, 56 + i * 12], [0, 1], clamp);
          return (
            <div key={f} style={{
              padding: '26px 36px', borderRadius: 30, background: '#fff', border: `2px solid ${color.line}`, fontSize: 44, fontWeight: 700, color: color.ink,
              opacity: s, transform: `translateX(${(1 - s) * 80}px)`, boxShadow: '0 16px 40px -20px rgba(15,23,42,0.25)',
            }}>{f}</div>
          );
        })}
      </div>
    </LightBackground>
  );
}

function CallToAction() {
  const frame = useCurrentFrame();
  const logo = useSpring(0, { damping: 12 });
  const title = useSpring(10);
  const year = useSpring(18);
  const cta = useSpring(30, { damping: 11 });
  const bounce = Math.abs(Math.sin(frame / 8)) * 40;
  return (
    <BrandBackground>
      <div style={{ position: 'absolute', top: 360, width: '100%', textAlign: 'center', transform: `scale(${logo})` }}>
        <Logo size={1} light />
      </div>
      <div style={{
        position: 'absolute', top: 640, left: 60, right: 60, textAlign: 'center', color: '#fff', fontFamily: sans, fontSize: 130, fontWeight: 800,
        letterSpacing: -4, lineHeight: 1, opacity: title, transform: `translateY(${(1 - title) * 50}px)`,
      }}>
        Pide la tuya
      </div>
      <div style={{ position: 'absolute', top: 860, width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: sans, fontSize: 46, fontWeight: 600, opacity: title }}>
        Tu mascota siempre con cómo volver a casa
      </div>
      <div style={{ position: 'absolute', top: 990, width: '100%', textAlign: 'center', opacity: year, transform: `translateY(${(1 - year) * 30}px)` }}>
        <span style={{
          display: 'inline-block', padding: '20px 44px', borderRadius: 999, background: 'rgba(255,255,255,0.14)', border: '2px solid rgba(255,255,255,0.35)',
          color: '#fff', fontFamily: sans, fontSize: 46, fontWeight: 700,
        }}>
          ✨ Placa + 1 año de servicio incluido
        </span>
      </div>
      <div style={{ position: 'absolute', top: 1180, width: '100%', textAlign: 'center', opacity: cta, transform: `scale(${0.8 + cta * 0.2})` }}>
        <span style={{ display: 'inline-block', padding: '30px 60px', borderRadius: 999, background: '#fff', color: color.brandDark, fontFamily: sans, fontSize: 60, fontWeight: 800 }}>
          Toca el enlace 👇
        </span>
      </div>
      <div style={{ position: 'absolute', top: 1400 + bounce, width: '100%', display: 'flex', justifyContent: 'center', color: '#fff', opacity: cta }}>
        <Icon name="chevronDown" size={150} width={2.6} />
      </div>
    </BrandBackground>
  );
}

const T = 12;
const SCENES: { id: string; frames: number; Scene: ComponentType }[] = [
  { id: 'hook', frames: 95, Scene: HookScene },
  { id: 'photo', frames: 125, Scene: ScanPhoto },
  { id: 'alert', frames: 130, Scene: ScanAlert },
  { id: 'profile', frames: 190, Scene: ProfileShort },
  { id: 'tag', frames: 165, Scene: TagFeatures },
  { id: 'cta', frames: 140, Scene: CallToAction },
];

export const WHATSAPP_FRAMES = SCENES.reduce((sum, s) => sum + s.frames, 0) - T * (SCENES.length - 1);

export function WhatsAppStatus() {
  return (
    <TransitionSeries>
      {SCENES.flatMap(({ id, frames, Scene }, i) => [
        ...(i ? [<TransitionSeries.Transition key={`${id}-in`} presentation={fade()} timing={linearTiming({ durationInFrames: T })} />] : []),
        <TransitionSeries.Sequence key={id} durationInFrames={frames}>
          <Scene />
        </TransitionSeries.Sequence>,
      ])}
    </TransitionSeries>
  );
}

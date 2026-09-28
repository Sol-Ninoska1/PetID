import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, display, icons, sans, type IconName } from './theme';

export const SCREEN_W = 600;
export const SCREEN_H = 1299;
const BEZEL = 18;

export function Icon({ name, size, stroke = 'currentColor', width = 2, style }: {
  name: IconName; size: number; stroke?: string; width?: number; style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={stroke} strokeWidth={width}
      strokeLinecap="round" strokeLinejoin="round" style={style}
      dangerouslySetInnerHTML={{ __html: icons[name] }}
    />
  );
}

export function useSpring(delay = 0, config: { damping?: number; mass?: number; stiffness?: number } = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 14, ...config } });
}

export function LightBackground({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 30;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #eef8f4 0%, #ffffff 55%, #f4faf7 100%)', fontFamily: sans }}>
      <div style={{ position: 'absolute', width: 900, height: 900, borderRadius: '50%', left: -380 + drift, top: -300, background: 'radial-gradient(circle, rgba(127,210,182,0.35), transparent 65%)' }} />
      <div style={{ position: 'absolute', width: 800, height: 800, borderRadius: '50%', right: -360 - drift, bottom: -200, background: 'radial-gradient(circle, rgba(239,107,91,0.14), transparent 65%)' }} />
      {children}
    </AbsoluteFill>
  );
}

export function BrandBackground({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  const paws = [
    { x: 90, y: 260, s: 130, r: -20 }, { x: 820, y: 180, s: 100, r: 25 }, { x: 760, y: 1480, s: 160, r: -35 },
    { x: 120, y: 1580, s: 110, r: 15 }, { x: 900, y: 860, s: 90, r: 40 }, { x: 60, y: 900, s: 80, r: -10 },
  ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 20%, #23967c 0%, ${color.brand} 35%, ${color.brandDeep} 100%)`, fontFamily: sans }}>
      {paws.map((p, i) => (
        <Icon
          key={i} name="paw" size={p.s} stroke="rgba(255,255,255,0.09)" width={1.6}
          style={{ position: 'absolute', left: p.x, top: p.y + Math.sin((frame + i * 20) / 25) * 14, transform: `rotate(${p.r + Math.sin((frame + i * 13) / 30) * 6}deg)` }}
        />
      ))}
      {children}
    </AbsoluteFill>
  );
}

/** Step heading at the top of the frame: "1 · Escanea la placa" + subtitle. */
export function Caption({ step, badge, title, subtitle, delay = 4, dark = false }: {
  step?: number; badge?: string; title: string; subtitle?: string; delay?: number; dark?: boolean;
}) {
  const inTitle = useSpring(delay);
  const inSub = useSpring(delay + 8);
  return (
    <div style={{ position: 'absolute', top: 120, left: 70, right: 70, textAlign: 'center', fontFamily: sans }}>
      {badge && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderRadius: 999,
          background: '#fdecea', color: '#c2412f', fontSize: 30, fontWeight: 800, opacity: inTitle, transform: `scale(${0.8 + inTitle * 0.2})`,
        }}>🚨 {badge}</div>
      )}
      {step !== undefined && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 14, padding: '10px 26px 10px 12px', borderRadius: 999,
          background: dark ? 'rgba(255,255,255,0.14)' : color.brandLight, color: dark ? '#fff' : color.brandDark,
          fontSize: 30, fontWeight: 700, opacity: inTitle, transform: `scale(${0.8 + inTitle * 0.2})`,
        }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 999, background: dark ? '#fff' : color.brand, color: dark ? color.brand : '#fff', fontSize: 26, fontWeight: 800 }}>{step}</span>
          Paso {step}
        </div>
      )}
      <h1 style={{
        margin: '26px 0 0', fontSize: 74, lineHeight: 1.08, fontWeight: 800, letterSpacing: -1.5,
        color: dark ? '#fff' : color.ink, opacity: inTitle, transform: `translateY(${(1 - inTitle) * 40}px)`,
      }}>{title}</h1>
      {subtitle && (
        <p style={{
          margin: '18px 0 0', fontSize: 38, lineHeight: 1.3, fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.8)' : color.muted, opacity: inSub, transform: `translateY(${(1 - inSub) * 30}px)`,
        }}>{subtitle}</p>
      )}
    </div>
  );
}

/** iPhone-like frame. Children are laid out in a SCREEN_W × SCREEN_H box. */
export function Phone({ children, top = 540, delay = 0, style }: {
  children: ReactNode; top?: number; delay?: number; style?: CSSProperties;
}) {
  const enter = useSpring(delay, { damping: 16 });
  return (
    <div style={{
      position: 'absolute', left: (1080 - SCREEN_W - BEZEL * 2) / 2, top,
      width: SCREEN_W + BEZEL * 2, height: SCREEN_H + BEZEL * 2, borderRadius: 96, background: '#0b0b0f',
      boxShadow: '0 60px 120px -30px rgba(15,23,42,0.45), 0 0 0 3px #2a2a33 inset',
      transform: `translateY(${(1 - enter) * 500}px)`, ...style,
    }}>
      <div style={{ position: 'absolute', inset: BEZEL, borderRadius: 80, overflow: 'hidden', background: '#fff' }}>
        {children}
        <div style={{ position: 'absolute', top: 20, left: '50%', width: 180, height: 52, marginLeft: -90, borderRadius: 30, background: '#000', zIndex: 50 }} />
      </div>
    </div>
  );
}

/** Finger-tap ripple at a point in phone-screen coordinates. */
export function Tap({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -12 || t > 30) return null;
  const approach = interpolate(t, [-12, 0], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const ripple = interpolate(t, [0, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, zIndex: 40, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', width: 90, height: 90, left: -45, top: -45, borderRadius: 999,
        background: 'rgba(255,255,255,0.55)', border: '4px solid rgba(15,23,42,0.35)',
        opacity: t < 0 ? approach : 1 - ripple, transform: `scale(${t < 0 ? 1.3 - approach * 0.3 : 1 - ripple * 0.2})`,
      }} />
      <div style={{
        position: 'absolute', width: 90, height: 90, left: -45, top: -45, borderRadius: 999,
        border: '4px solid rgba(255,255,255,0.9)', opacity: t < 0 ? 0 : 1 - ripple, transform: `scale(${1 + ripple * 1.6})`,
      }} />
    </div>
  );
}

export function Logo({ size = 1, light = false }: { size?: number; light?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 22 * size, fontFamily: sans }}>
      <div style={{
        display: 'grid', placeItems: 'center', width: 120 * size, height: 120 * size, borderRadius: 34 * size,
        background: light ? '#fff' : color.brand, color: light ? color.brand : '#fff', boxShadow: '0 20px 40px -12px rgba(0,0,0,0.35)',
      }}>
        <Icon name="paw" size={66 * size} />
      </div>
      <span style={{ fontSize: 110 * size, fontWeight: 800, letterSpacing: -3 * size, color: light ? '#fff' : color.ink }}>
        Pet<span style={{ color: light ? color.mint : color.brand }}>ID</span>
      </span>
    </div>
  );
}

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const easeInOut = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

export function typed(text: string, frame: number, from: number, to: number) {
  return text.slice(0, Math.floor(interpolate(frame, [from, to], [0, text.length], clamp)));
}

/** Children see a local frame counter starting at `from`. */
export function SequenceFrom({ from, children }: { from: number; children: ReactNode }) {
  return <Sequence from={from} layout="none">{children}</Sequence>;
}

export function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? '#fff' : color.ink;
  return (
    <div style={{ position: 'absolute', top: 30, left: 56, right: 50, display: 'flex', justifyContent: 'space-between', zIndex: 45, color: c, fontFamily: sans, fontSize: 26, fontWeight: 700 }}>
      <span>9:41</span>
      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ display: 'flex', gap: 3, alignItems: 'flex-end' }}>
          {[8, 12, 16, 20].map((h) => <span key={h} style={{ width: 5, height: h, borderRadius: 2, background: c }} />)}
        </span>
        <span style={{ width: 42, height: 20, borderRadius: 6, border: `2.5px solid ${c}`, padding: 2, boxSizing: 'border-box' }}>
          <span style={{ display: 'block', width: '75%', height: '100%', borderRadius: 2, background: c }} />
        </span>
      </span>
    </div>
  );
}

/** Form field styled like the app's `field-label` + `field-input`. */
export function Field({ label, value, placeholder = '', top, left = 36, width = SCREEN_W - 72, height = 66, caret, suffix }: {
  label: ReactNode; value: string; placeholder?: string; top: number; left?: number; width?: number; height?: number; caret?: boolean; suffix?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const multiline = height > 80;
  return (
    <div style={{ position: 'absolute', top, left, width, fontFamily: sans }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: color.ink, marginBottom: 8 }}>{label}</div>
      <div style={{
        height, borderRadius: 16, border: `2px solid ${caret ? color.brand : color.line}`, background: '#fff', boxSizing: 'border-box',
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', padding: multiline ? '14px 18px' : '0 18px',
        fontSize: 23, lineHeight: 1.35, fontWeight: 500, color: value ? color.ink : '#94a3b8',
        boxShadow: caret ? `0 0 0 5px ${color.brandLight}` : 'none',
      }}>
        <span style={{ flex: multiline ? 1 : undefined, whiteSpace: multiline ? 'normal' : 'nowrap', overflow: 'hidden' }}>
          {value || placeholder}
          {caret && <span style={{ display: 'inline-block', verticalAlign: 'middle', width: 3, height: 28, marginLeft: 2, background: color.brand, opacity: Math.floor(frame / 8) % 2 }} />}
        </span>
        {suffix && <span style={{ marginLeft: 'auto', color: color.muted, display: 'flex' }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function Headline({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: display, fontWeight: 700, ...style }}>{children}</div>;
}

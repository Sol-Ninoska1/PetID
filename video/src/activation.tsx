import type { ReactNode } from 'react';
import { Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import {
  Caption, clamp, easeInOut, Field, Icon, LightBackground, Logo, Phone, SCREEN_H, SCREEN_W, SequenceFrom, StatusBar, Tap, typed, useSpring,
} from './components';
import { color, sans } from './theme';

const PET_CODE = 'PET-00001';
const FACE = '58% 45%';

function Stepper({ current, top, light = false }: { current: number; top: number; light?: boolean }) {
  const steps = ['Tu cuenta', 'Tu mascota', '¡Activada!'];
  return (
    <div style={{ position: 'absolute', top, left: 36, right: 36, display: 'flex', gap: 10, fontSize: 19, fontWeight: 700, fontFamily: sans }}>
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, color: light ? '#fff' : now || done ? color.ink : color.muted }}>
            <span style={{
              display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 999, flexShrink: 0,
              background: done ? (light ? '#fff' : color.brand) : now ? color.brandLight : '#f1f5f9',
              color: done ? (light ? color.brand : '#fff') : now ? color.brandDark : color.muted,
              boxShadow: now ? `0 0 0 3px ${color.brand}` : 'none',
            }}>{done ? <Icon name="check" size={22} width={3} /> : i + 1}</span>
            {s}
          </div>
        );
      })}
    </div>
  );
}

function PrimaryButton({ top, left = 36, width = SCREEN_W - 72, label, pressed = 1 }: { top: number; left?: number; width?: number; label: string; pressed?: number }) {
  return (
    <div style={{
      position: 'absolute', top, left, width, height: 92, borderRadius: 22, background: color.brand, color: '#fff',
      display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 800, fontFamily: sans, transform: `scale(${pressed})`,
    }}>{label}</div>
  );
}

function pressAt(frame: number, at: number) {
  return interpolate(frame, [at - 2, at + 3, at + 10], [1, 0.95, 1], clamp);
}

// ─── Paso 2 · Cuenta ────────────────────────────────────────────────────────

function ActivateCard() {
  return (
    <div style={{ position: 'absolute', inset: 0, background: color.surface, fontFamily: sans }}>
      <div style={{ position: 'absolute', top: 96, left: 36 }}><Logo size={0.36} /></div>
      <Stepper current={0} top={205} />
      <div style={{ position: 'absolute', top: 300, left: 30, right: 30, height: 740, borderRadius: 36, background: '#fff', border: `2px solid ${color.line}`, boxShadow: '0 20px 40px -24px rgba(15,23,42,0.25)', textAlign: 'center' }}>
        <div style={{ margin: '56px auto 0', width: 116, height: 116, borderRadius: 32, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center' }}>
          <Icon name="paw" size={60} />
        </div>
        <div style={{ marginTop: 36, fontSize: 42, fontWeight: 800, color: color.ink, letterSpacing: -1 }}>Activa tu PetID</div>
        <div style={{ margin: '14px 40px 0', fontSize: 25, lineHeight: 1.4, color: color.muted }}>
          Crea tu cuenta o inicia sesión para vincular <b style={{ color: color.ink }}>{PET_CODE}</b> a tu mascota.
        </div>
      </div>
      <PrimaryButton top={730} left={70} width={SCREEN_W - 140} label="Crear cuenta" />
      <div style={{ position: 'absolute', top: 842, left: 70, right: 70, height: 92, borderRadius: 22, background: '#fff', border: `2px solid ${color.line}`, color: color.ink, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700 }}>Ya tengo cuenta · Iniciar sesión</div>
      <div style={{ position: 'absolute', top: 968, left: 60, right: 60, textAlign: 'center', fontSize: 19, color: color.muted }}>Tus datos privados nunca se muestran al escanear el QR.</div>
    </div>
  );
}

function RegisterAccount() {
  const frame = useCurrentFrame();
  const name = typed('María', frame, 14, 26);
  const email = typed('maria@email.com', frame, 28, 52);
  const phone = typed('+56 9 XXXXXXX', frame, 54, 78);
  const pass = typed('••••••••', frame, 82, 96);
  const confirm = typed('••••••••', frame, 100, 112);
  const focus = frame < 26 ? 'name' : frame < 52 ? 'email' : frame < 80 ? 'phone' : frame < 98 ? 'pass' : frame < 116 ? 'confirm' : '';
  return (
    <div style={{ position: 'absolute', inset: 0, background: color.surface, fontFamily: sans }}>
      <div style={{ position: 'absolute', top: 96, left: 36 }}><Logo size={0.36} /></div>
      <div style={{ position: 'absolute', top: 186, left: 36, fontSize: 40, fontWeight: 800, color: color.ink, letterSpacing: -1 }}>Crea tu cuenta</div>
      <div style={{ position: 'absolute', top: 240, left: 36, fontSize: 22, color: color.muted }}>Paso 1 de 2 para activar tu PetID.</div>
      <div style={{ position: 'absolute', top: 290, left: 36, right: 36, padding: '16px 20px', borderRadius: 18, background: '#ecfdf5', border: '2px solid #a7f3d0', color: '#065f46', fontSize: 19, lineHeight: 1.4 }}>
        🐾 Después de crear tu cuenta registrarás a tu mascota y tu PetID quedará activa.
      </div>
      <Field label="Nombre" value={name} placeholder="Tu nombre" top={410} caret={focus === 'name'} />
      <Field label="Email" value={email} placeholder="tu@email.com" top={522} caret={focus === 'email'} />
      <Field label="Teléfono" value={phone} placeholder="+56 9 …" top={634} caret={focus === 'phone'} />
      <Field label="Contraseña" value={pass} placeholder="Mínimo 8 caracteres" top={746} caret={focus === 'pass'} />
      <Field label="Confirmar contraseña" value={confirm} top={858} caret={focus === 'confirm'} />
      <PrimaryButton top={990} label="Crear cuenta" pressed={pressAt(frame, 126)} />
    </div>
  );
}

export function AccountScene() {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [70, 86], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  return (
    <LightBackground>
      <Caption step={2} title="Crea tu cuenta" subtitle="Con tu nombre, email y teléfono" />
      <Phone top={520} delay={-30}>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${-slide * SCREEN_W}px)` }}><ActivateCard /></div>
        <div style={{ position: 'absolute', inset: 0, transform: `translateX(${(1 - slide) * SCREEN_W}px)` }}>
          <SequenceFrom from={76}><RegisterAccount /></SequenceFrom>
        </div>
        <StatusBar />
        <Tap x={SCREEN_W / 2} y={776} at={60} />
        <Tap x={SCREEN_W / 2} y={1036} at={202} />
      </Phone>
    </LightBackground>
  );
}

// ─── Pet form (Pasos 3–7) ───────────────────────────────────────────────────

type FormState = {
  scroll: number;
  photo?: number;
  cover?: number;
  name?: string;
  dog?: boolean;
  breed?: string;
  sex?: string;
  birth?: string;
  colour?: string;
  weight?: string;
  desc?: string;
  allergies?: string;
  needs?: string;
  contactName?: string;
  contactPhone?: string;
  relation?: string;
  focus?: string;
  saving?: boolean;
  pressed?: number;
};

const CARD = { left: 30, width: SCREEN_W - 60 };
const IN = { left: 54, width: SCREEN_W - 108 };
const COVER_H = Math.round(CARD.width / 2.5);

export const FORM = {
  photoCard: 380,
  circle: 380 + COVER_H - 95,
  formCard: 990,
  species: 1175,
  health: 1900,
  contact: 2390,
  privacy: 2790,
  submit: 3110,
};

function Card({ top, height, children }: { top: number; height: number; children?: ReactNode }) {
  return (
    <div style={{
      position: 'absolute', top, left: CARD.left, width: CARD.width, height, borderRadius: 32, background: '#fff',
      border: `2px solid ${color.line}`, boxShadow: '0 16px 30px -24px rgba(15,23,42,0.3)', overflow: 'hidden',
    }}>{children}</div>
  );
}

function SmallButton({ top, left, width, icon, label, disabled }: { top: number; left: number; width: number; icon: 'edit' | 'camera'; label: string; disabled?: boolean }) {
  return (
    <div style={{
      position: 'absolute', top, left, width, height: 62, borderRadius: 16, border: `2px solid ${color.line}`, background: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 22, fontWeight: 700,
      color: disabled ? '#94a3b8' : color.ink,
    }}><Icon name={icon} size={24} />{label}</div>
  );
}

function SpeciesCard({ left, emoji, label, selected }: { left: number; emoji: string; label: string; selected: boolean }) {
  return (
    <div style={{
      position: 'absolute', top: FORM.species, left, width: 158, height: 112, borderRadius: 20,
      background: selected ? color.brandLight : '#fff', color: selected ? color.brandDark : color.ink,
      boxShadow: selected ? `0 0 0 4px ${color.brand}` : `0 0 0 2px ${color.line}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 22, fontWeight: 700,
    }}><span style={{ fontSize: 38 }}>{emoji}</span>{label}</div>
  );
}

function Check({ top, title, hint }: { top: number; title: string; hint: string }) {
  return (
    <div style={{ position: 'absolute', top, left: IN.left, right: IN.left, display: 'flex', gap: 16 }}>
      <span style={{ marginTop: 4, width: 30, height: 30, flexShrink: 0, borderRadius: 8, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center' }}>
        <Icon name="check" size={22} width={3.2} />
      </span>
      <div>
        <div style={{ fontSize: 23, fontWeight: 600, color: color.ink }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 19, lineHeight: 1.35, color: color.muted }}>{hint}</div>
      </div>
    </div>
  );
}

function PetFormPage(s: FormState) {
  const f = s.focus;
  const half = (IN.width - 16) / 2;
  const photo = s.photo ?? 0;
  const cover = s.cover ?? 0;
  return (
    <div style={{ position: 'absolute', inset: 0, background: color.surface, fontFamily: sans, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: SCREEN_W, height: 3300, transform: `translateY(${-s.scroll}px)` }}>
        <div style={{ position: 'absolute', top: 96, left: 36 }}><Logo size={0.36} /></div>
        <Stepper current={1} top={190} />
        <div style={{ position: 'absolute', top: 262, width: '100%', textAlign: 'center', fontSize: 34, fontWeight: 800, color: color.ink }}>🐾 Registra a tu mascota</div>
        <div style={{ position: 'absolute', top: 312, left: 50, right: 50, textAlign: 'center', fontSize: 20, color: color.muted }}>
          Al guardar, la PetID <b style={{ color: color.ink }}>{PET_CODE}</b> quedará vinculada a tu mascota.
        </div>

        <Card top={FORM.photoCard} height={580}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: COVER_H, background: 'linear-gradient(135deg,#e2e8f0,#f1f5f9)' }}>
            <div style={{ position: 'absolute', top: 18, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 19, fontWeight: 600, color: '#64748b' }}>
              <Icon name="camera" size={22} /> Agregar portada
            </div>
            <Img src={staticFile('cover.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%', opacity: cover }} />
          </div>
        </Card>
        <div style={{
          position: 'absolute', top: FORM.circle, left: SCREEN_W / 2 - 95, width: 190, height: 190, borderRadius: 999, overflow: 'hidden',
          border: '6px solid #fff', boxSizing: 'border-box', background: color.brandLight, boxShadow: '0 12px 26px -10px rgba(15,23,42,0.35)',
          display: 'grid', placeItems: 'center', color: color.brandDark, textAlign: 'center',
        }}>
          <div><Icon name="camera" size={40} /><div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Agregar foto</div></div>
          <Img src={staticFile('max.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: FACE, opacity: photo, transform: `scale(${1.2 - photo * 0.2})` }} />
        </div>
        <div style={{ position: 'absolute', top: 718, left: IN.left, fontSize: 18, fontWeight: 700, letterSpacing: 1, color: color.muted }}>FOTO DE PERFIL</div>
        <SmallButton top={750} left={IN.left} width={half} icon="edit" label="Ajustar" disabled={photo < 1} />
        <SmallButton top={750} left={IN.left + half + 16} width={half} icon="camera" label={photo >= 1 ? 'Cambiar' : 'Agregar'} />
        <div style={{ position: 'absolute', top: 832, left: IN.left, fontSize: 18, fontWeight: 700, letterSpacing: 1, color: color.muted }}>
          PORTADA <span style={{ fontWeight: 500, letterSpacing: 0 }}>(opcional)</span>
        </div>
        <SmallButton top={864} left={IN.left} width={half} icon="edit" label="Ajustar" disabled={cover < 1} />
        <SmallButton top={864} left={IN.left + half + 16} width={half} icon="camera" label={cover >= 1 ? 'Cambiar' : 'Agregar'} />

        <Card top={FORM.formCard} height={880} />
        <Field label="Nombre *" value={s.name ?? ''} placeholder="Ej: Max" top={1025} {...IN} caret={f === 'name'} />
        <div style={{ position: 'absolute', top: 1143, left: IN.left, fontSize: 20, fontWeight: 600, color: color.ink }}>Especie *</div>
        <SpeciesCard left={IN.left} emoji="🐶" label="Perro" selected={!!s.dog} />
        <SpeciesCard left={IN.left + 167} emoji="🐱" label="Gato" selected={false} />
        <SpeciesCard left={IN.left + 334} emoji="🐾" label="Otro" selected={false} />
        <Field label="Raza" value={s.breed ?? ''} placeholder="Ej: Labrador" top={1310} left={IN.left} width={half} caret={f === 'breed'} />
        <Field label="Sexo" value={s.sex ?? 'No indicado'} top={1310} left={IN.left + half + 16} width={half} caret={f === 'sex'} suffix={<Icon name="chevronDown" size={24} />} />
        <Field label="Fecha de nacimiento" value={s.birth ?? ''} placeholder="dd/mm/aaaa" top={1428} left={IN.left} width={half} caret={f === 'birth'} suffix={<Icon name="calendar" size={22} />} />
        <Field label="Color" value={s.colour ?? ''} placeholder="Ej: Dorado" top={1428} left={IN.left + half + 16} width={half} caret={f === 'colour'} />
        <Field label="Peso (kg)" value={s.weight ?? ''} placeholder="Ej: 28" top={1546} left={IN.left} width={half} caret={f === 'weight'} />
        <Field label="Descripción" value={s.desc ?? ''} placeholder="Rasgos que ayuden a reconocerla, carácter…" top={1664} {...IN} height={150} caret={f === 'desc'} />

        <Card top={FORM.health} height={460} />
        <div style={{ position: 'absolute', top: FORM.health + 30, left: IN.left, fontSize: 24, fontWeight: 800, color: color.ink }}>Salud e información importante</div>
        <Field label="Alergias" value={s.allergies ?? ''} placeholder="Ej: Pollo" top={FORM.health + 84} {...IN} caret={f === 'allergies'} />
        <Field label="Medicamentos" value="" placeholder="Ej: Antiinflamatorio cada 12 horas" top={FORM.health + 202} {...IN} />
        <Field label="Necesidades especiales" value={s.needs ?? ''} placeholder="Ej: Es sorda, se acerca con comida" top={FORM.health + 320} {...IN} caret={f === 'needs'} />

        <Card top={FORM.contact} height={370} />
        <div style={{ position: 'absolute', top: FORM.contact + 30, left: IN.left, fontSize: 24, fontWeight: 800, color: color.ink }}>Contacto de emergencia</div>
        <div style={{ position: 'absolute', top: FORM.contact + 64, left: IN.left, right: IN.left, fontSize: 18, lineHeight: 1.3, color: color.muted }}>Alguien de confianza por si no te pueden ubicar. Solo tú lo ves.</div>
        <Field label="Nombre *" value={s.contactName ?? ''} top={FORM.contact + 126} left={IN.left} width={200} caret={f === 'contactName'} />
        <Field label="Teléfono *" value={s.contactPhone ?? ''} placeholder="+56 9…" top={FORM.contact + 126} left={IN.left + 216} width={IN.width - 216} caret={f === 'contactPhone'} />
        <Field label={<>Relación <span style={{ color: color.muted, fontWeight: 400 }}>(opcional)</span></>} value={s.relation ?? ''} placeholder="Ej: Hermana" top={FORM.contact + 244} {...IN} caret={f === 'relation'} />

        <Card top={FORM.privacy} height={290} />
        <div style={{ position: 'absolute', top: FORM.privacy + 30, left: IN.left, display: 'flex', alignItems: 'center', gap: 10, fontSize: 23, fontWeight: 800, color: color.ink }}>
          <span style={{ color: color.brand, display: 'flex' }}><Icon name="shield" size={26} /></span> Qué se muestra al escanear el QR
        </div>
        <Check top={FORM.privacy + 84} title="Botones Llamar y WhatsApp" hint="Usan el teléfono de tu cuenta." />
        <Check top={FORM.privacy + 170} title="Alergias y necesidades especiales" hint="Útil para que quien la encuentre la cuide bien." />

        <PrimaryButton top={FORM.submit} label={s.saving ? 'Activando…' : 'Activar mi PetID'} pressed={s.pressed ?? 1} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 80, background: `linear-gradient(${color.surface} 70%, rgba(247,249,248,0))` }} />
    </div>
  );
}

// ─── Cropper modal (same layout as `shared/ui/image-cropper.ts`) ───────────

type CropperProps = {
  src: string; imgW: number; imgH: number; aspect: number; heading: string; hint: string;
  open: number; zoom: number; pan: { x: number; y: number }; finger?: { x: number; y: number } | null; donePressed: number;
};

const VIEW_W = SCREEN_W - 68;
const MAX_ZOOM = 4;

function Cropper({ src, imgW, imgH, aspect, heading, hint, open, zoom, pan, finger, donePressed }: CropperProps) {
  const viewH = VIEW_W / aspect;
  const base = Math.max(VIEW_W / imgW, viewH / imgH);
  const w = imgW * base * zoom;
  const h = imgH * base * zoom;
  const sheetH = 34 + 44 + 62 + 22 + viewH + 26 + 50 + 28 + 88 + 44;
  const knob = (zoom - 1) / (MAX_ZOOM - 1);
  const sliderLeft = 84;
  const sliderW = VIEW_W - 2 * 66;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 30, fontFamily: sans }}>
      <div style={{ position: 'absolute', inset: 0, background: `rgba(15,23,42,${0.7 * open})` }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: sheetH, borderRadius: '40px 40px 0 0', background: '#fff',
        padding: '34px 34px 0', boxSizing: 'border-box', transform: `translateY(${(1 - open) * sheetH}px)`, boxShadow: '0 -20px 50px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', height: 44 + 62 }}>
          <div>
            <div style={{ fontSize: 30, fontWeight: 800, color: color.ink }}>{heading}</div>
            <div style={{ marginTop: 6, fontSize: 20, lineHeight: 1.35, color: color.muted }}>{hint}</div>
          </div>
          <span style={{ color: color.muted }}><Icon name="x" size={30} /></span>
        </div>
        <div style={{ position: 'relative', marginTop: 22, width: VIEW_W, height: viewH, borderRadius: 24, overflow: 'hidden', background: '#0f172a' }}>
          <Img src={staticFile(src)} style={{ position: 'absolute', left: '50%', top: '50%', width: w, height: h, maxWidth: 'none', transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))` }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)' }}>
            {Array.from({ length: 9 }, (_, i) => <span key={i} style={{ border: '1px solid rgba(255,255,255,0.25)' }} />)}
          </div>
          <div style={{ position: 'absolute', inset: 0, borderRadius: 24, boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.85)' }} />
        </div>
        <div style={{ position: 'relative', marginTop: 26, height: 50 }}>
          <span style={{ position: 'absolute', left: 14, top: 4, fontSize: 34, color: color.ink }}>−</span>
          <div style={{ position: 'absolute', left: sliderLeft - 34, top: 22, width: sliderW, height: 8, borderRadius: 4, background: color.line }}>
            <div style={{ width: `${knob * 100}%`, height: '100%', borderRadius: 4, background: color.brand }} />
            <div style={{ position: 'absolute', left: `${knob * 100}%`, top: -12, width: 32, height: 32, marginLeft: -16, borderRadius: 999, background: color.brand, border: '4px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }} />
          </div>
          <span style={{ position: 'absolute', right: 14, top: 4, fontSize: 34, color: color.ink }}>+</span>
        </div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ height: 88, borderRadius: 22, border: `2px solid ${color.line}`, display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700, color: color.ink }}>Cancelar</div>
          <div style={{ height: 88, borderRadius: 22, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800, transform: `scale(${donePressed})` }}>Listo</div>
        </div>
      </div>
      {finger && (
        <div style={{
          position: 'absolute', left: finger.x - 36, top: SCREEN_H - sheetH + finger.y - 36, width: 72, height: 72, borderRadius: 999,
          background: 'rgba(255,255,255,0.6)', border: '4px solid rgba(15,23,42,0.35)', boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        }} />
      )}
    </div>
  );
}

/** Where things sit inside the cropper sheet, relative to its top edge. */
function cropperLayout(aspect: number) {
  const viewH = VIEW_W / aspect;
  const viewTop = 34 + 44 + 62 + 22;
  const sliderY = viewTop + viewH + 26 + 26;
  const sheetH = sliderY - 26 + 50 + 28 + 88 + 44;
  const sliderX = (zoom: number) => 34 + 84 - 34 + ((zoom - 1) / (MAX_ZOOM - 1)) * (VIEW_W - 132);
  return { viewTop, viewH, sliderY, sliderX, doneX: 34 + VIEW_W * 0.75 + 4, doneY: sliderY + 24 + 28 + 44, sheetH };
}

type CropTimeline = { open: number; zoomFrom: number; zoomTo: number; panFrom: number; panTo: number; done: number; zoom: number; pan: { x: number; y: number } };

function useCropAnimation(t: CropTimeline, aspect: number) {
  const frame = useCurrentFrame();
  const openIn = useSpring(t.open, { damping: 18 });
  const openOut = interpolate(frame, [t.done + 6, t.done + 20], [0, 1], { ...clamp, easing: easeInOut });
  const zoom = interpolate(frame, [t.zoomFrom, t.zoomTo], [1, t.zoom], { ...clamp, easing: easeInOut });
  const panP = interpolate(frame, [t.panFrom, t.panTo], [0, 1], { ...clamp, easing: easeInOut });
  const pan = { x: t.pan.x * panP, y: t.pan.y * panP };
  const L = cropperLayout(aspect);
  let finger: { x: number; y: number } | null = null;
  if (frame >= t.zoomFrom - 6 && frame <= t.zoomTo + 4) finger = { x: L.sliderX(zoom), y: L.sliderY };
  else if (frame >= t.panFrom - 6 && frame <= t.panTo + 4) finger = { x: SCREEN_W / 2 - 60 + pan.x * 0.6, y: L.viewTop + L.viewH / 2 + pan.y * 0.6 };
  return { open: Math.min(openIn, 1 - openOut), zoom, pan, finger, visible: frame >= t.open && openOut < 1, donePressed: pressAt(frame, t.done), L };
}

// ─── Paso 3 · Foto ──────────────────────────────────────────────────────────

const PHOTO_SCROLL = 200;
const PHOTO_CROP: CropTimeline = { open: 30, zoomFrom: 62, zoomTo: 96, panFrom: 104, panTo: 132, done: 152, zoom: 1.7, pan: { x: -110, y: 40 } };

export function PhotoScene() {
  const frame = useCurrentFrame();
  const c = useCropAnimation(PHOTO_CROP, 1);
  const photo = interpolate(frame, [PHOTO_CROP.done + 14, PHOTO_CROP.done + 26], [0, 1], clamp);
  return (
    <LightBackground>
      <Caption step={3} title="Sube su foto" subtitle="Ajusta el zoom para que se vea su cara" />
      <Phone top={520} delay={-30}>
        <PetFormPage scroll={PHOTO_SCROLL} photo={photo} />
        <StatusBar />
        <Tap x={SCREEN_W / 2} y={FORM.circle + 95 - PHOTO_SCROLL} at={22} />
        {c.visible && (
          <Cropper src="max.jpg" imgW={1080} imgH={720} aspect={1} heading="Ajusta la foto" hint="Arrastra la foto y usa el zoom para centrar su cara."
            open={c.open} zoom={c.zoom} pan={c.pan} finger={c.finger} donePressed={c.donePressed} />
        )}
        <Tap x={c.L.doneX} y={SCREEN_H - c.L.sheetH + c.L.doneY} at={PHOTO_CROP.done} />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 4 · Portada ───────────────────────────────────────────────────────

const COVER_CROP: CropTimeline = { open: 28, zoomFrom: 56, zoomTo: 86, panFrom: 94, panTo: 118, done: 136, zoom: 1.35, pan: { x: 30, y: -24 } };

export function CoverScene() {
  const frame = useCurrentFrame();
  const c = useCropAnimation(COVER_CROP, 2.5);
  const cover = interpolate(frame, [COVER_CROP.done + 14, COVER_CROP.done + 26], [0, 1], clamp);
  return (
    <LightBackground>
      <Caption step={4} title="Agrega una portada" subtitle="Opcional · un toque personal, como en Facebook" />
      <Phone top={520} delay={-30}>
        <PetFormPage scroll={PHOTO_SCROLL} photo={1} cover={cover} />
        <StatusBar />
        <Tap x={SCREEN_W / 2} y={FORM.photoCard + 40 - PHOTO_SCROLL} at={20} />
        {c.visible && (
          <Cropper src="cover.jpg" imgW={1600} imgH={800} aspect={2.5} heading="Ajusta la portada" hint="Arrastra la foto y usa el zoom para centrar lo que quieres mostrar."
            open={c.open} zoom={c.zoom} pan={c.pan} finger={c.finger} donePressed={c.donePressed} />
        )}
        <Tap x={c.L.doneX} y={SCREEN_H - c.L.sheetH + c.L.doneY} at={COVER_CROP.done} />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 5 · Datos ─────────────────────────────────────────────────────────

const DATA_SCROLL = 880;
const FORM_X = { dog: IN.left + 79, right: IN.left + (IN.width - 16) * 0.75 + 16 };
const DESC = 'Muy amistoso y juguetón. Le encantan las pelotas.';

export function DataScene() {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [16, 44], [PHOTO_SCROLL, DATA_SCROLL], { ...clamp, easing: easeInOut });
  const focus = frame < 48 ? '' : frame < 64 ? 'name' : frame < 84 ? '' : frame < 106 ? 'breed' : frame < 122 ? 'sex' : frame < 146 ? 'birth' : frame < 164 ? 'colour' : frame < 182 ? 'weight' : frame < 262 ? 'desc' : '';
  return (
    <LightBackground>
      <Caption step={5} title="Completa sus datos" subtitle="Nombre, especie, raza, sexo, edad, color y peso" />
      <Phone top={520} delay={-30}>
        <PetFormPage
          scroll={scroll} photo={1} cover={1} focus={focus}
          name={typed('Max', frame, 50, 60)}
          dog={frame >= 74}
          breed={typed('Labrador', frame, 88, 104)}
          sex={frame >= 116 ? 'Macho' : undefined}
          birth={typed('14/03/2021', frame, 124, 144)}
          colour={typed('Dorado', frame, 148, 162)}
          weight={typed('29.5', frame, 166, 178)}
          desc={typed(DESC, frame, 186, 256)}
        />
        <StatusBar />
        <Tap x={FORM_X.dog} y={FORM.species + 56 - DATA_SCROLL} at={72} />
        <Tap x={FORM_X.right} y={1310 + 63 - DATA_SCROLL} at={110} />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 6 · Salud y contacto ──────────────────────────────────────────────

const HEALTH_SCROLL = 1820;
const PET_DATA = { name: 'Max', dog: true, breed: 'Labrador', sex: 'Macho', birth: '14/03/2021', colour: 'Dorado', weight: '29.5', desc: DESC };

export function HealthScene() {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [16, 50], [DATA_SCROLL, HEALTH_SCROLL], { ...clamp, easing: easeInOut });
  const focus = frame < 54 ? '' : frame < 72 ? 'allergies' : frame < 116 ? 'needs' : frame < 134 ? 'contactName' : frame < 170 ? 'contactPhone' : frame < 192 ? 'relation' : '';
  const glow = interpolate(frame, [200, 214, 240], [0, 1, 0], clamp);
  return (
    <LightBackground>
      <Caption step={6} title="Salud y contacto" subtitle="Alergias, cuidados y un contacto de emergencia" />
      <Phone top={520} delay={-30}>
        <PetFormPage
          {...PET_DATA} scroll={scroll} photo={1} cover={1} focus={focus}
          allergies={typed('Pollo', frame, 56, 68)}
          needs={typed('Le asustan los fuegos artificiales', frame, 74, 112)}
          contactName={typed('Gabriela', frame, 118, 134)}
          contactPhone={typed('+56 9 XXXXXXX', frame, 138, 166)}
          relation={typed('Hermana', frame, 174, 188)}
        />
        <div style={{
          position: 'absolute', left: CARD.left, top: FORM.privacy - HEALTH_SCROLL, width: CARD.width, height: 290, borderRadius: 32,
          boxShadow: `0 0 0 ${6 * glow}px rgba(255,214,10,${glow})`,
        }} />
        <StatusBar />
      </Phone>
    </LightBackground>
  );
}

// ─── Paso 7 · Activar ───────────────────────────────────────────────────────

const SUBMIT_SCROLL = 1990;
const HEALTH_DATA = { allergies: 'Pollo', needs: 'Le asustan los fuegos artificiales', contactName: 'Gabriela', contactPhone: '+56 9 XXXXXXX', relation: 'Hermana' };

export function ActivateScene() {
  const frame = useCurrentFrame();
  const scroll = interpolate(frame, [16, 36], [HEALTH_SCROLL, SUBMIT_SCROLL], { ...clamp, easing: easeInOut });
  const done = useSpring(66, { damping: 12 });
  return (
    <LightBackground>
      <Caption step={7} title="¡Actívala!" subtitle="Tu PetID queda vinculada a tu mascota" />
      <Phone top={520} delay={-30}>
        <PetFormPage {...PET_DATA} {...HEALTH_DATA} scroll={scroll} photo={1} cover={1} saving={frame >= 50} pressed={pressAt(frame, 48)} />
        <StatusBar light={frame >= 66} />
        <Tap x={SCREEN_W / 2} y={FORM.submit + 46 - SUBMIT_SCROLL} at={48} />
        {frame >= 64 && (
          <div style={{ position: 'absolute', inset: 0, background: `rgba(11,70,56,${Math.min(done * 1.2, 1)})`, fontFamily: sans, zIndex: 30 }}>
            <div style={{ opacity: done }}><Stepper current={3} top={130} light /></div>
            <div style={{ position: 'absolute', top: 330, width: '100%', textAlign: 'center', color: '#fff', transform: `scale(${done})` }}>
              <div style={{ margin: '0 auto', width: 220, height: 220, borderRadius: 999, overflow: 'hidden', border: '8px solid #fff', boxSizing: 'border-box' }}>
                <Img src={staticFile('max.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: FACE }} />
              </div>
              <div style={{ margin: '-40px auto 0', position: 'relative', width: 80, height: 80, borderRadius: 999, background: '#fff', color: color.brand, display: 'grid', placeItems: 'center', marginLeft: 330 }}>
                <Icon name="check" size={50} width={3.2} />
              </div>
              <div style={{ marginTop: 30, fontSize: 50, fontWeight: 800 }}>¡PetID activada!</div>
              <div style={{ marginTop: 12, fontSize: 26, opacity: 0.85 }}>{PET_CODE} ahora es la placa de Max 🐾</div>
            </div>
          </div>
        )}
      </Phone>
    </LightBackground>
  );
}

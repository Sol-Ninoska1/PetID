import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ProductsRepository } from '../../core/data/products.repository';
import { CatalogProduct } from '../../core/models';
import { SupportPreset, SupportSection } from './support-section';
import { Icon, IconName } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { QrCode } from '../../shared/ui/qr-code';
import { publicPetIdUrl } from '../../shared/utils/qr-label';
import { CatalogSection } from './catalog-section';
import { ReviewsSection } from './reviews-section';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo, QrCode, CatalogSection, ReviewsSection, SupportSection],
  templateUrl: './landing.html',
})
export class Landing implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly productsRepo = inject(ProductsRepository);
  protected readonly demoUrl = publicPetIdUrl('demo-max');
  protected readonly catalog = signal<CatalogProduct[]>([]);
  protected readonly tutorialPlaying = signal(false);
  protected readonly supportPreset = signal<SupportPreset | null>(null);

  /** Query param from the owner's "Renovar" button: PetID code to renew. */
  readonly renovar = input<string>();

  async ngOnInit() {
    const code = this.renovar()?.trim();
    if (code && /^[A-Z0-9-]{1,20}$/i.test(code)) {
      this.supportPreset.set({ topic: 'renovacion', message: `Hola, quiero renovar el plan de mi PetID ${code} por un año más.` });
    }
    this.catalog.set(await this.productsRepo.catalog().catch(() => []));
  }

  protected playTutorial(video: HTMLVideoElement) {
    this.tutorialPlaying.set(true);
    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void video.play();
  }

  protected requestPurchase() {
    this.supportPreset.set({ topic: 'pedido', message: 'Hola, quiero comprar una placa PetID.' });
  }

  protected readonly steps = [
    { icon: 'bag', title: 'Recibe tu PetID', text: 'Un collar o placa resistente con un código QR único.' },
    { icon: 'qr', title: 'Escanéala y actívala', text: 'Crea tu cuenta y registra a tu mascota con foto y datos de salud.' },
    { icon: 'heart', title: 'Vuelve a casa', text: 'Quien la encuentre escanea el QR y te avisa en segundos.' },
  ] satisfies { icon: IconName; title: string; text: string }[];

  protected readonly tutorialSteps = [
    'Escanea el QR de tu placa con la cámara.',
    'Crea tu cuenta con tu nombre, email y teléfono.',
    'Sube su foto y ajusta el zoom.',
    'Agrega una portada (opcional).',
    'Completa sus datos: nombre, especie, raza, edad y más.',
    'Agrega su información de salud y un contacto de emergencia.',
    'Toca "Activar mi PetID" y listo.',
    'En iPhone, agrégala a tu inicio desde Safari (Compartir → Agregar a inicio).',
    'En Android, desde Chrome: menú ⋮ → Agregar a la pantalla principal (o Instalar app).',
    'Ábrela desde el ícono, toca "Activar avisos" y luego Permitir.',
  ];

  protected readonly priceIncludes = [
    { icon: 'qr', title: 'Placa con QR grabado', text: 'Sin batería ni apps: la lee cualquier cámara.' },
    { icon: 'bell', title: 'Aviso inmediato', text: 'Te avisa apenas escanean su placa.' },
    { icon: 'map-pin', title: 'Ubicación', text: 'Quien la encuentre te envía dónde está.' },
    { icon: 'alert', title: 'Modo perdida', text: 'Una alerta visible en su perfil con un toque.' },
    { icon: 'phone', title: 'Contacto de emergencia', text: 'Un segundo número por si no contestas.' },
    { icon: 'shield', title: 'Privacidad', text: 'Tu dirección y email nunca se muestran.' },
    { icon: 'edit', title: 'Siempre actualizada', text: 'Cambia sus datos sin comprar otra placa.' },
    { icon: 'mail', title: 'Soporte incluido', text: 'Te ayudamos a activarla y usarla.' },
  ] satisfies { icon: IconName; title: string; text: string }[];

  protected readonly faqs = [
    {
      q: '¿Necesita batería o GPS?',
      a: 'No. La placa no usa batería: funciona con un código QR que cualquier teléfono puede leer. Cuando alguien la escanea puede enviarte su ubicación.',
    },
    {
      q: '¿Qué datos míos se ven?',
      a: 'Solo tu nombre de pila y botones para llamarte o escribirte por WhatsApp (puedes desactivarlos). Tu email, apellido y dirección nunca se muestran.',
    },
    {
      q: '¿Sirve para gatos y otras mascotas?',
      a: 'Sí. Al registrarla eliges si es perro, gato u otra mascota, y su perfil muestra sus datos igual.',
    },
    {
      q: '¿Qué pasa después del primer año?',
      a: 'Te avisamos 30 días antes y puedes renovarlo por un año más escribiéndonos. Si no renuevas, la placa sigue funcionando en modo básico: al escanearla se ve su foto, su nombre y cómo contactarte, pero ya no recibes avisos al celular ni puedes editar su perfil.',
    },
    {
      q: '¿Puedo usar la misma placa con otra mascota?',
      a: 'No. Cada PetID se activa una sola vez y queda vinculada a una mascota, así nadie más puede tomar su placa.',
    },
  ];
}

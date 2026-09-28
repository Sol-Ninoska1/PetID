import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ProductsRepository } from '../../core/data/products.repository';
import { CatalogProduct } from '../../core/models';
import { Icon, IconName } from '../../shared/ui/icon';
import { Logo } from '../../shared/ui/logo';
import { QrCode } from '../../shared/ui/qr-code';
import { publicPetIdUrl } from '../../shared/utils/qr-label';
import { CatalogSection } from './catalog-section';

@Component({
  selector: 'app-landing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, Logo, QrCode, CatalogSection],
  templateUrl: './landing.html',
})
export class Landing implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly productsRepo = inject(ProductsRepository);
  protected readonly demoUrl = publicPetIdUrl('demo-max');
  protected readonly catalog = signal<CatalogProduct[]>([]);

  async ngOnInit() {
    this.catalog.set(await this.productsRepo.catalog().catch(() => []));
  }

  protected readonly steps = [
    { icon: 'bag', title: 'Recibe tu PetID', text: 'Un collar o placa resistente con un código QR único.' },
    { icon: 'qr', title: 'Escanéala y actívala', text: 'Crea tu cuenta y registra a tu mascota con foto y datos de salud.' },
    { icon: 'heart', title: 'Vuelve a casa', text: 'Quien la encuentre escanea el QR y te avisa en segundos.' },
  ] satisfies { icon: IconName; title: string; text: string }[];

  protected readonly benefits = [
    { icon: 'smartphone', title: 'Sin apps', text: 'Funciona con la cámara de cualquier teléfono.' },
    { icon: 'bell', title: 'Aviso inmediato', text: 'Te llega el aviso con los datos de quien la encontró.' },
    { icon: 'map-pin', title: 'Ubicación', text: 'Quien la encuentre puede enviarte su ubicación exacta.' },
    { icon: 'shield', title: 'Privacidad', text: 'Tu dirección y email nunca se muestran.' },
    { icon: 'edit', title: 'Siempre actualizada', text: 'Cambia tus datos sin comprar otra placa.' },
    { icon: 'alert', title: 'Modo perdida', text: 'Activa una alerta visible en su perfil con un toque.' },
  ] satisfies { icon: IconName; title: string; text: string }[];

  protected readonly faqs = [
    {
      q: '¿Necesita batería o GPS?',
      a: 'No. La placa no usa batería: funciona con un código QR que cualquier teléfono puede leer. Cuando alguien la escanea puede enviarte su ubicación.',
    },
    {
      q: '¿Quien la encuentre necesita descargar algo?',
      a: 'No. Solo apunta la cámara del teléfono al código y se abre el perfil de tu mascota en el navegador.',
    },
    {
      q: '¿Qué datos míos se ven?',
      a: 'Solo tu nombre de pila y botones para llamarte o escribirte por WhatsApp (puedes desactivarlos). Tu email, apellido y dirección nunca se muestran.',
    },
    {
      q: '¿Cómo activo mi PetID?',
      a: 'Escanea el QR de tu collar con la cámara del teléfono, crea tu cuenta y registra a tu mascota. Cada PetID se activa una sola vez y queda vinculada a tu cuenta.',
    },
    {
      q: '¿Qué pasa si cambio de teléfono o de casa?',
      a: 'Actualizas tus datos desde tu cuenta y la placa sigue funcionando. El QR solo contiene un enlace, no tus datos.',
    },
    {
      q: '¿Hay que pagar una suscripción?',
      a: 'No. Pagas una vez por la placa y el perfil digital queda activo para siempre.',
    },
  ];
}

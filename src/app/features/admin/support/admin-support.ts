import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FeedbackRepository } from '../../../core/data/feedback.repository';
import { SupportMessage, SupportStatus, SupportTopic } from '../../../core/models';
import { Icon } from '../../../shared/ui/icon';
import { AdminTable } from '../ui/admin-table';

const TOPIC: Record<SupportTopic, string> = {
  activacion: 'Activación',
  pedido: 'Compra / envío',
  tecnico: 'Técnico',
  sugerencia: 'Sugerencia',
  otro: 'Otro',
};

const STATUS: Record<SupportStatus, { label: string; css: string }> = {
  nuevo: { label: 'Nuevo', css: 'bg-red-100 text-red-700' },
  resuelto: { label: 'Resuelto', css: 'bg-brand-100 text-brand-800' },
};

@Component({
  selector: 'app-admin-support',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, AdminTable, Icon],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="page-title">Soporte</h1>
        <p class="mt-1 text-muted">Mensajes del formulario de contacto. También llegan al email de administración.</p>
      </div>
      <div class="flex gap-1 rounded-xl bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
        @for (f of filters; track f.value) {
          <button type="button" class="rounded-lg px-3 py-1.5" [class]="filter() === f.value ? 'bg-brand-600 text-white' : 'text-muted hover:text-ink'" (click)="filter.set(f.value)">
            {{ f.label }}@if (f.value === 'nuevo' && pending()) { <span class="ml-1">({{ pending() }})</span> }
          </button>
        }
      </div>
    </div>

    @if (actionError()) { <p class="alert-error mt-4" role="alert">{{ actionError() }}</p> }

    <app-admin-table class="mt-6" [loading]="loading()" [error]="error()" [empty]="!visible().length" emptyText="No hay mensajes aquí.">
      <thead>
        <tr><th>Fecha</th><th>Quién escribe</th><th>Tema</th><th>Mensaje</th><th>Estado</th><th></th></tr>
      </thead>
      <tbody>
        @for (m of visible(); track m.id) {
          <tr class="align-top">
            <td class="whitespace-nowrap text-muted">{{ m.createdAt | date: 'dd/MM/yy HH:mm' }}</td>
            <td>
              <span class="block font-semibold">{{ m.name }}</span>
              <a class="block text-xs text-brand-700 hover:underline" [href]="'mailto:' + m.email">{{ m.email }}</a>
              @if (m.phone) { <span class="block text-xs text-muted">{{ m.phone }}</span> }
              @if (m.hasAccount) { <span class="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">Cliente</span> }
            </td>
            <td class="whitespace-nowrap">{{ topic[m.topic] }}</td>
            <td class="min-w-64 max-w-md">
              <p class="whitespace-pre-line text-muted" [class.line-clamp-3]="expanded() !== m.id">{{ m.message }}</p>
              @if (m.message.length > 160) {
                <button type="button" class="mt-1 text-xs font-semibold text-brand-700" (click)="expanded.set(expanded() === m.id ? null : m.id)">
                  {{ expanded() === m.id ? 'Ver menos' : 'Ver completo' }}
                </button>
              }
            </td>
            <td><span class="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold" [class]="status[m.status].css">{{ status[m.status].label }}</span></td>
            <td>
              <div class="flex justify-end gap-2">
                <a class="btn btn-secondary btn-sm" [href]="replyLink(m)"><app-icon name="mail" class="size-4" /> Responder</a>
                <button type="button" class="btn btn-ghost btn-sm whitespace-nowrap" [disabled]="busy() === m.id" (click)="toggle(m)">
                  {{ m.status === 'nuevo' ? 'Marcar resuelto' : 'Reabrir' }}
                </button>
              </div>
            </td>
          </tr>
        }
      </tbody>
    </app-admin-table>
  `,
})
export class AdminSupport implements OnInit {
  private readonly repo = inject(FeedbackRepository);

  protected readonly topic = TOPIC;
  protected readonly status = STATUS;
  protected readonly filters: { value: SupportStatus | 'all'; label: string }[] = [
    { value: 'nuevo', label: 'Pendientes' },
    { value: 'resuelto', label: 'Resueltos' },
    { value: 'all', label: 'Todos' },
  ];

  protected readonly items = signal<SupportMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly filter = signal<SupportStatus | 'all'>('nuevo');
  protected readonly expanded = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);

  protected readonly pending = computed(() => this.items().filter((m) => m.status === 'nuevo').length);
  protected readonly visible = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.items() : this.items().filter((m) => m.status === f);
  });

  async ngOnInit() {
    try {
      this.items.set(await this.repo.listSupport());
    } catch {
      this.error.set('No pudimos cargar los mensajes.');
    } finally {
      this.loading.set(false);
    }
  }

  protected replyLink(m: SupportMessage): string {
    const subject = encodeURIComponent(`Re: Soporte PetID · ${TOPIC[m.topic]}`);
    const quoted = m.message.split('\n').map((l) => `> ${l}`).join('\n');
    const body = encodeURIComponent(`Hola ${m.name.split(' ')[0]},\n\n\n\n${quoted}`);
    return `mailto:${m.email}?subject=${subject}&body=${body}`;
  }

  protected async toggle(m: SupportMessage) {
    const next: SupportStatus = m.status === 'nuevo' ? 'resuelto' : 'nuevo';
    this.busy.set(m.id);
    this.actionError.set(null);
    try {
      await this.repo.setSupportStatus(m.id, next);
      this.items.update((list) =>
        list.map((x) => (x.id === m.id ? { ...x, status: next, resolvedAt: next === 'resuelto' ? new Date().toISOString() : null } : x)),
      );
    } catch {
      this.actionError.set('No pudimos actualizar el mensaje.');
    } finally {
      this.busy.set(null);
    }
  }
}

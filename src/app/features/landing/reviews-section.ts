import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { FeedbackRepository } from '../../core/data/feedback.repository';
import { OwnReview, ReviewSummary } from '../../core/models';
import { ConfirmService } from '../../shared/ui/confirm-dialog';
import { Icon } from '../../shared/ui/icon';
import { StarRating } from '../../shared/ui/star-rating';

const COMMENT_MAX = 1000;
const PAGE = 6;
const RATING_WORDS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', '¡Excelente!'];

type WriteState = 'loading' | 'guest' | 'no_pet' | 'ready';

/** Public reviews (average, distribution, latest comments) plus the form for customers. */
@Component({
  selector: 'app-reviews-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, Icon, StarRating],
  template: `
    <h2 class="text-center text-3xl font-bold tracking-tight">Lo que dicen las familias PetID</h2>
    <p class="mx-auto mt-2 max-w-lg text-center text-muted">Opiniones de clientes que ya protegen a su mascota.</p>

    <div class="mt-10 grid gap-6 lg:grid-cols-[20rem_1fr]">
      <!-- Summary + write -->
      <div class="space-y-4">
        <div class="card p-6">
          @if (summary(); as s) {
            @if (s.total) {
              <div class="flex items-end gap-3">
                <span class="text-6xl font-extrabold leading-none tracking-tight">{{ averageText() }}</span>
                <span class="pb-1 text-sm text-muted">de 5</span>
              </div>
            } @else {
              <p class="text-2xl font-bold">Sin calificaciones aún</p>
            }
            <app-star-rating class="mt-3" [value]="s.average" starClass="size-6" />
            <p class="mt-1 text-sm text-muted">{{ s.total === 1 ? '1 reseña' : s.total + ' reseñas' }}</p>
            <div class="mt-5 space-y-1.5">
              @for (star of [5, 4, 3, 2, 1]; track star) {
                <div class="flex items-center gap-2 text-xs font-semibold text-muted">
                  <span class="w-3 text-right">{{ star }}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div class="h-full rounded-full bg-amber-400" [style.width.%]="s.total ? (s.counts[star - 1] / s.total) * 100 : 0"></div>
                  </div>
                  <span class="w-6 text-right">{{ s.counts[star - 1] }}</span>
                </div>
              }
            </div>
          } @else {
            <div class="h-44 animate-pulse rounded-2xl bg-slate-100"></div>
          }
        </div>

        <div class="card p-6" id="escribir-resena">
          @switch (writeState()) {
            @case ('loading') {
              <div class="h-24 animate-pulse rounded-2xl bg-slate-100"></div>
            }
            @case ('guest') {
              <p class="font-bold">¿Ya tienes tu PetID?</p>
              <p class="mt-1 text-sm text-muted">Inicia sesión para contarnos tu experiencia.</p>
              <a routerLink="/login" [queryParams]="{ returnUrl: '/#resenas' }" class="btn btn-secondary mt-4 w-full">
                <app-icon name="star" class="size-4" /> Escribir una reseña
              </a>
            }
            @case ('no_pet') {
              <p class="font-bold">Activa tu PetID para opinar</p>
              <p class="mt-1 text-sm text-muted">Las reseñas son solo de clientes con una mascota registrada.</p>
              <a routerLink="/dashboard" class="btn btn-secondary mt-4 w-full">Ir a mis mascotas</a>
            }
            @case ('ready') {
              @if (mine() && !editing()) {
                <p class="text-xs font-bold uppercase tracking-wide text-muted">Tu reseña</p>
                <app-star-rating class="mt-2" [value]="mine()!.rating" starClass="size-5" />
                @if (mine()!.comment) {
                  <p class="mt-2 text-sm">"{{ mine()!.comment }}"</p>
                }
                @if (mine()!.isHidden) {
                  <p class="alert-error mt-3 text-xs">Tu reseña fue ocultada por moderación.</p>
                }
                @if (notice()) {
                  <p class="alert-success mt-3 text-sm" role="status">{{ notice() }}</p>
                }
                <div class="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="startEdit()"><app-icon name="edit" class="size-4" /> Editar</button>
                  <button type="button" class="btn btn-ghost btn-sm text-red-600" [disabled]="saving()" (click)="remove()"><app-icon name="trash" class="size-4" /> Borrar</button>
                </div>
              } @else {
                <form (ngSubmit)="save()" novalidate>
                  <p class="font-bold">{{ mine() ? 'Edita tu reseña' : '¿Qué te parece PetID?' }}</p>
                  <app-star-rating class="mt-3" [(value)]="rating" [editable]="true" starClass="size-9" label="Tu calificación" />
                  <p class="mt-1 h-5 text-sm font-semibold text-amber-600">{{ ratingWord() }}</p>
                  <label class="field-label mt-3" for="review-comment">Comentario <span class="font-normal text-muted">(opcional)</span></label>
                  <textarea id="review-comment" name="comment" rows="4" class="field-input" [maxlength]="commentMax"
                    placeholder="Cuéntanos cómo te ha servido…" [(ngModel)]="comment"></textarea>
                  <p class="mt-1 text-right text-xs text-muted">{{ comment().length }}/{{ commentMax }}</p>
                  @if (error()) {
                    <p class="alert-error mt-2 text-sm" role="alert">{{ error() }}</p>
                  }
                  <div class="mt-3 flex gap-2">
                    @if (mine()) {
                      <button type="button" class="btn btn-ghost flex-1" (click)="editing.set(false)">Cancelar</button>
                    }
                    <button type="submit" class="btn btn-primary flex-1" [disabled]="saving() || !rating()">
                      {{ saving() ? 'Guardando…' : mine() ? 'Guardar' : 'Publicar reseña' }}
                    </button>
                  </div>
                </form>
              }
            }
          }
        </div>
      </div>

      <!-- Reviews list -->
      <div>
        @if (summary(); as s) {
          @if (s.reviews.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @for (r of visibleReviews(); track r.id) {
                <article class="card flex flex-col p-5">
                  <div class="flex items-center justify-between gap-3">
                    <app-star-rating [value]="r.rating" starClass="size-4" />
                    <time class="text-xs text-muted" [attr.datetime]="r.createdAt">{{ r.createdAt | date: 'dd/MM/yyyy' }}</time>
                  </div>
                  @if (r.comment) {
                    <p class="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed">{{ r.comment }}</p>
                  } @else {
                    <p class="mt-3 flex-1 text-sm italic text-muted">Calificó con {{ r.rating }} {{ r.rating === 1 ? 'estrella' : 'estrellas' }}.</p>
                  }
                  <div class="mt-4 flex items-center gap-2">
                    <span class="grid size-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{{ r.authorName.charAt(0) }}</span>
                    <span class="text-sm font-semibold">{{ r.authorName }}</span>
                  </div>
                </article>
              }
            </div>
            @if (s.reviews.length > shown()) {
              <div class="mt-6 text-center">
                <button type="button" class="btn btn-secondary" (click)="shown.set(shown() + page)">Ver más reseñas</button>
              </div>
            }
          } @else {
            <div class="card grid h-full min-h-48 place-items-center p-8 text-center">
              <div>
                <app-star-rating [value]="0" starClass="size-7" />
                <p class="mt-3 font-bold">Aún no hay reseñas</p>
                <p class="mt-1 text-sm text-muted">¡Sé el primero en contar tu experiencia!</p>
              </div>
            </div>
          }
        } @else {
          <div class="grid gap-4 sm:grid-cols-2">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="card h-40 animate-pulse bg-white/60"></div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ReviewsSection {
  private readonly repo = inject(FeedbackRepository);
  private readonly auth = inject(AuthService);
  private readonly confirmDialog = inject(ConfirmService);

  protected readonly commentMax = COMMENT_MAX;
  protected readonly page = PAGE;
  protected readonly summary = signal<ReviewSummary | null>(null);
  protected readonly shown = signal(PAGE);
  protected readonly visibleReviews = computed(() => this.summary()?.reviews.slice(0, this.shown()) ?? []);
  protected readonly averageText = computed(() => (this.summary()?.average ?? 0).toFixed(1).replace('.', ','));

  protected readonly writeState = signal<WriteState>('loading');
  protected readonly mine = signal<OwnReview | null>(null);
  protected readonly editing = signal(false);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly ratingWord = computed(() => RATING_WORDS[this.rating()] ?? '');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  constructor() {
    void this.loadSummary();
    effect(() => {
      if (!this.auth.initialized()) return;
      void this.loadWriteState(this.auth.userId());
    });
  }

  protected startEdit() {
    const mine = this.mine();
    this.rating.set(mine?.rating ?? 0);
    this.comment.set(mine?.comment ?? '');
    this.notice.set(null);
    this.editing.set(true);
  }

  protected async save() {
    const userId = this.auth.userId();
    if (!userId || !this.rating()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const comment = this.comment().trim().slice(0, COMMENT_MAX) || null;
      await this.repo.saveMyReview(this.mine()?.id ?? null, { rating: this.rating(), comment });
      this.mine.set(await this.repo.myReview(userId));
      this.editing.set(false);
      this.notice.set('¡Gracias por tu reseña! 💚');
      await this.loadSummary();
    } catch {
      this.error.set('No pudimos guardar tu reseña. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove() {
    const mine = this.mine();
    if (!mine || !(await this.confirmDialog.ask({ title: '¿Borrar tu reseña?', confirmText: 'Borrar', icon: 'trash', danger: true }))) return;
    this.saving.set(true);
    try {
      await this.repo.deleteMyReview(mine.id);
      this.mine.set(null);
      this.rating.set(0);
      this.comment.set('');
      this.notice.set(null);
      await this.loadSummary();
    } finally {
      this.saving.set(false);
    }
  }

  private async loadSummary() {
    try {
      this.summary.set(await this.repo.publicReviews());
    } catch {
      this.summary.set({ average: 0, total: 0, counts: [0, 0, 0, 0, 0], reviews: [] });
    }
  }

  private async loadWriteState(userId: string | null) {
    if (!userId) {
      this.writeState.set('guest');
      return;
    }
    this.writeState.set('loading');
    try {
      const [canReview, mine] = await Promise.all([this.repo.canReview(userId), this.repo.myReview(userId)]);
      this.mine.set(mine);
      this.writeState.set(canReview || mine ? 'ready' : 'no_pet');
    } catch {
      this.writeState.set('guest');
    }
  }
}

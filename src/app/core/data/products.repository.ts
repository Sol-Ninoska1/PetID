import { inject, Injectable } from '@angular/core';
import { CatalogProduct, Product, ProductInput } from '../models';
import { SupabaseService } from '../supabase/supabase.service';

type Row = Record<string, any>;

const PHOTO_BUCKET = 'product-photos';
const PRODUCT_FIELDS = '*, variants:product_variants(color, size, stock, position)';

const toProduct = (r: Row): Product => ({
  id: r['id'],
  name: r['name'],
  description: r['description'],
  type: r['type'],
  photoUrl: r['photo_url'],
  priceClp: r['price_clp'],
  isActive: r['is_active'],
  createdAt: r['created_at'],
  variants: [...(r['variants'] ?? [])]
    .sort((a: Row, b: Row) => a['position'] - b['position'])
    .map((v: Row) => ({ color: v['color'], size: v['size'], stock: v['stock'] })),
});

const toCatalogProduct = (r: Row): CatalogProduct => ({
  id: r['id'],
  name: r['name'],
  description: r['description'],
  type: r['type'],
  photoUrl: r['photo_url'],
  priceClp: r['price_clp'],
  variants: (r['variants'] ?? []).map((v: Row) => ({ color: v['color'], size: v['size'], inStock: v['in_stock'] })),
});

@Injectable({ providedIn: 'root' })
export class ProductsRepository {
  private readonly db = inject(SupabaseService).client;

  /** Admin only (RLS). */
  async list(): Promise<Product[]> {
    const { data, error } = await this.db.from('products').select(PRODUCT_FIELDS).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(toProduct);
  }

  async getById(id: string): Promise<Product> {
    const { data, error } = await this.db.from('products').select(PRODUCT_FIELDS).eq('id', id).single();
    if (error) throw error;
    return toProduct(data);
  }

  /** Creates (id null) or updates a product and replaces its variants atomically. Returns the product id. */
  async save(id: string | null, input: ProductInput): Promise<string> {
    const { data, error } = await this.db.rpc('admin_save_product', {
      p_id: id,
      p_product: {
        name: input.name,
        description: input.description,
        type: input.type,
        photo_url: input.photoUrl,
        price_clp: input.priceClp,
        is_active: input.isActive,
      },
      p_variants: input.variants,
    });
    if (error) throw error;
    return data;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.db.from('products').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('products').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadPhoto(file: Blob): Promise<string> {
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await this.db.storage.from(PHOTO_BUCKET).upload(path, file, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return this.db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  /** Public, active products only. */
  async catalog(): Promise<CatalogProduct[]> {
    const { data, error } = await this.db.rpc('get_catalog');
    if (error) throw error;
    return (data ?? []).map(toCatalogProduct);
  }
}

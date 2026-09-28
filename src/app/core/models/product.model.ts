export type ProductType = 'collar' | 'placa' | 'tag';

export const PRODUCT_TYPES: ProductType[] = ['collar', 'placa', 'tag'];

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  collar: 'Collar',
  placa: 'Placa',
  tag: 'Tag',
};

export interface ProductVariant {
  /** Null means "única" / not applicable. */
  color: string | null;
  size: string | null;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  photoUrl: string | null;
  priceClp: number;
  isActive: boolean;
  createdAt: string;
  variants: ProductVariant[];
}

export type ProductInput = Omit<Product, 'id' | 'createdAt'>;

/** What visitors see on the landing: availability instead of stock numbers. */
export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  type: ProductType;
  photoUrl: string | null;
  priceClp: number;
  variants: { color: string | null; size: string | null; inStock: boolean }[];
}

export const totalStock = (p: Pick<Product, 'variants'>) => p.variants.reduce((sum, v) => sum + v.stock, 0);

import type { OFFProductSearchResult, ProductDraft } from "@/lib/types";

const CATEGORY_TAG_MAP: Record<string, string> = {
  beverages: "Bebidas",
  sodas: "Bebidas",
  drinks: "Bebidas",
  waters: "Bebidas",
  snacks: "Golosinas",
  "sweet-snacks": "Golosinas",
  candies: "Golosinas",
  chocolates: "Golosinas",
  dairies: "Lácteos",
  "dairy-products": "Lácteos",
  milks: "Lácteos",
  yogurts: "Lácteos",
  breads: "Panadería",
  bakery: "Panadería",
  groceries: "Almacén",
  cleaners: "Limpieza",
  tobacco: "Tabaco",
};

function cleanCategoryTag(tag: string): string {
  const stripped = tag.includes(":") ? tag.split(":").slice(1).join(":") : tag;
  return CATEGORY_TAG_MAP[stripped] ?? stripped.replace(/-/g, " ");
}

/**
 * Mapea una sugerencia de Open Food Facts al ProductDraft que consume
 * <ProductCreationModal />. Función pura — separada del modal a propósito
 * para que sumar nuevas fuentes (scanner de barras, importación CSV, etc.)
 * sea sólo escribir otro mapper sin tocar el componente.
 */
export function mapOpenFoodFactsToDraft(s: OFFProductSearchResult): ProductDraft {
  const categories = (s.categories ?? [])
    .map(cleanCategoryTag)
    .filter((c) => c.length > 0);

  return {
    barcode: s.barcode,
    name: s.name,
    brand: s.brand ?? undefined,
    imageUrl: s.imageUrl ?? undefined,
    categories: Array.from(new Set(categories)).slice(0, 4),
    externalSource: "openfoodfacts",
  };
}

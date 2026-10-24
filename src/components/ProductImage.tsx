import bread from "@/assets/products/bread.jpg";
import groceries from "@/assets/products/groceries.jpg";
import drinks from "@/assets/products/drinks.jpg";
import toiletries from "@/assets/products/toiletries.jpg";
import cleaning from "@/assets/products/cleaning.jpg";
import general from "@/assets/products/general.jpg";

export function ProductImage({ name }: { name: string }) {
  const text = name.toLowerCase();
  const src = /bread/.test(text) ? bread
    : /milk|cola|oil|drink/.test(text) ? drinks
    : /toilet|tooth|soap|vaseline|pad/.test(text) ? toiletries
    : /omo|jik|sunlight|handy|washing|detergent/.test(text) ? cleaning
    : /candle|match|paraffin|airtime/.test(text) ? general : groceries;
  return <img src={src} alt={`${name} category illustration`} loading="lazy" width={512} height={512} className="aspect-square w-full object-contain bg-product-photo" />;
}
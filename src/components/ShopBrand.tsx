import logo from "@/assets/masibambane-logo.png";
export function ShopBrand({ large = false }: { large?: boolean }) {
  return <img src={logo} alt="Masibambane" width={1426} height={376} className={large ? "mx-auto h-auto w-72 max-w-full" : "h-auto w-40 max-w-full"} />;
}
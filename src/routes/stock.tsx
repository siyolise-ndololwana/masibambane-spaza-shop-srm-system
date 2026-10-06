import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { rand } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock Levels — Masibambane Spaza" },
      {
        name: "description",
        content:
          "Track product stock levels, reorder points and record deliveries at Masibambane Spaza Shop.",
      },
      { property: "og:title", content: "Stock Levels — Masibambane Spaza" },
      {
        property: "og:description",
        content: "Track product stock levels, reorder points and record stock deliveries.",
      },
    ],
  }),
  component: StockPage,
});

type ProductRow = {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  cost_price: number;
  quantity: number;
  reorder_level: number;
};

function StockPage() {
  const { user, loading } = useRequireAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: products } = useQuery({
    queryKey: ["products"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, selling_price, cost_price, quantity, reorder_level")
        .order("name");
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const filtered = (products ?? []).filter((p) =>
    (p.name + p.category).toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return null;

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Stock</h2>
            <p className="text-xs text-muted-foreground">{products?.length ?? 0} products</p>
          </div>
          <div className="flex gap-2">
            <ReceiveStockDialog onDone={() => qc.invalidateQueries()} products={products ?? []} />
            <AddProductDialog onDone={() => qc.invalidateQueries({ queryKey: ["products"] })} />
          </div>
        </div>

        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-surface"
        />

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {filtered.map((p, i) => {
            const low = p.quantity <= p.reorder_level;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-4 ${i > 0 ? "border-t border-border" : ""}`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {p.category} • {rand(p.selling_price)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={
                      p.quantity === 0
                        ? "text-sm font-bold text-destructive"
                        : low
                          ? "text-sm font-bold text-warning"
                          : "text-sm font-bold text-success"
                    }
                  >
                    {p.quantity} in stock
                  </p>
                  <ThresholdDialog product={p} onDone={() => qc.invalidateQueries()} />
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No products match that search.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AddProductDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "General",
    selling_price: "",
    cost_price: "",
    quantity: "0",
    reorder_level: "10",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        name: form.name,
        category: form.category,
        selling_price: Number(form.selling_price || 0),
        cost_price: Number(form.cost_price || 0),
        quantity: Number(form.quantity || 0),
        reorder_level: Number(form.reorder_level || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Product added");
      setOpen(false);
      setForm({
        name: "",
        category: "General",
        selling_price: "",
        cost_price: "",
        quantity: "0",
        reorder_level: "10",
      });
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add product</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Product name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Albany Sliced Bread"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Selling price (R)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cost price (R)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Opening quantity</Label>
              <Input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder level</Label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name || mutation.isPending}
            className="w-full"
          >
            Save product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveStockDialog({
  products,
  onDone,
}: {
  products: ProductRow[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_deliveries").insert({
        product_id: productId,
        quantity: Number(quantity),
        unit_cost: Number(unitCost || 0),
        supplier_id: supplierId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Delivery recorded and stock updated");
      setOpen(false);
      setProductId("");
      setQuantity("");
      setUnitCost("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Receive stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record a stock delivery</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              <option value="">Choose a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Supplier</Label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm"
            >
              <option value="">Choose a supplier</option>
              {(suppliers ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity received</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit cost (R)</Label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!productId || !quantity || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save delivery
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ThresholdDialog({ product, onDone }: { product: ProductRow; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(String(product.reorder_level));
  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .update({ reorder_level: Math.max(0, Math.floor(Number(level))) })
        .eq("id", product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Alert level for ${product.name} updated`);
      setOpen(false);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setLevel(String(product.reorder_level));
      }}
    >
      <DialogTrigger asChild>
        <button className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline">
          Alert at {product.reorder_level} ✎
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Low-stock alert for {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Warn me when stock drops to</Label>
          <Input type="number" min={0} value={level} onChange={(e) => setLevel(e.target.value)} />
          <p className="text-xs text-muted-foreground">Currently {product.quantity} in stock.</p>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={level === "" || Number(level) < 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Save alert level
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

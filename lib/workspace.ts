import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type V2Plan = "basic" | "premium";

export type WorkspaceProduct = {
  id: string;
  name: string;
  category: string;
  image: string;
  price: number;
  cost: number;
  targetMargin: number;
  monthlySales: number;
  stock: number;
  minStock: number;
  sku: string;
};

export type CashTransaction = {
  id: string;
  kind: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  occurredAt: string;
  productId?: string | null;
};

export type WorkspaceState = {
  user: User | null;
  plan: V2Plan;
  credits: number;
  businessId: string | null;
  businessName: string;
  products: WorkspaceProduct[];
  cashTransactions: CashTransaction[];
};

export type AssistantProductInput = {
  name: string;
  category: string;
  salePrice: number;
  targetMargin: number;
  currentStock: number;
  minStock: number;
  monthlySales: number;
  imageUrl?: string;
  sku?: string;
  costItems: Array<{
    name: string;
    quantity: number;
    unitCost: number;
    category: "ingredient" | "packaging" | "labor" | "fixed" | "fees" | "losses" | string;
  }>;
};

const num = (value: unknown) => Number(value ?? 0) || 0;

export async function loadWorkspace(): Promise<WorkspaceState> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user ?? null;
  if (!user) {
    return { user: null, plan: "basic", credits: 0, businessId: null, businessName: "Meu negócio", products: [], cashTransactions: [] };
  }

  const [profileResult, businessResult, walletResult, productsResult, cashResult] = await Promise.all([
    supabase.from("profiles").select("plan,full_name").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id,name").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("assistant_wallets").select("included_remaining,purchased_remaining").eq("user_id", user.id).maybeSingle(),
    supabase.from("products").select("id,name,category,image_url,sale_price,unit_cost,target_margin,monthly_sales_estimate,current_stock,min_stock,sku,created_at").eq("user_id", user.id).eq("active", true).order("created_at", { ascending: false }),
    supabase.from("cash_transactions").select("id,kind,amount,category,description,occurred_at,product_id").eq("user_id", user.id).order("occurred_at", { ascending: false }).limit(200),
  ]);

  for (const result of [profileResult, businessResult, walletResult, productsResult, cashResult]) {
    if (result.error) throw result.error;
  }

  const products = (productsResult.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category || "Sem categoria",
    image: p.image_url || "",
    price: num(p.sale_price),
    cost: num(p.unit_cost),
    targetMargin: num(p.target_margin) || 35,
    monthlySales: num(p.monthly_sales_estimate),
    stock: num(p.current_stock),
    minStock: num(p.min_stock),
    sku: p.sku || "",
  }));

  const wallet = walletResult.data;
  const credits = num(wallet?.included_remaining) + num(wallet?.purchased_remaining);

  const cashTransactions: CashTransaction[] = (cashResult.data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as "income" | "expense",
    amount: num(row.amount),
    category: row.category || "Outros",
    description: row.description,
    occurredAt: row.occurred_at,
    productId: row.product_id,
  }));

  return {
    user,
    plan: (profileResult.data?.plan === "premium" ? "premium" : "basic") as V2Plan,
    credits,
    businessId: businessResult.data?.id ?? null,
    businessName: businessResult.data?.name || "Meu negócio",
    products,
    cashTransactions,
  };
}

export async function signInV2(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signUpV2(fullName: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) throw error;
  return data;
}

export async function signOutV2() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function uploadProductImage(file: File) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Faça login para enviar uma foto.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function registerProductWithAssistant(input: AssistantProductInput) {
  const { data, error } = await supabase.rpc("register_product_with_assistant", {
    p_name: input.name,
    p_category: input.category,
    p_sale_price: input.salePrice,
    p_target_margin: input.targetMargin,
    p_current_stock: input.currentStock,
    p_min_stock: input.minStock,
    p_image_url: input.imageUrl || null,
    p_sku: input.sku || null,
    p_monthly_sales_estimate: Math.round(input.monthlySales),
    p_cost_items: input.costItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit_cost: item.unitCost,
      category: item.category,
    })),
  });
  if (error) throw error;
  return data?.[0] as { product_id: string; remaining_total: number } | undefined;
}

export async function updateProductSalePrice(productId: string, salePrice: number) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Faça login para atualizar o preço.");
  const { error } = await supabase.from("products").update({ sale_price: salePrice }).eq("id", productId).eq("user_id", userId);
  if (error) throw error;
}

export async function addCashTransaction(input: { businessId?: string | null; kind: "income" | "expense"; amount: number; category: string; description: string; occurredAt: string; productId?: string | null }) {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Faça login para lançar no caixa.");
  const { data, error } = await supabase.from("cash_transactions").insert({
    user_id: userId,
    business_id: input.businessId || null,
    kind: input.kind,
    amount: input.amount,
    category: input.category,
    description: input.description,
    occurred_at: input.occurredAt,
    product_id: input.productId || null,
  }).select("id,kind,amount,category,description,occurred_at,product_id").single();
  if (error) throw error;
  return {
    id: data.id,
    kind: data.kind as "income" | "expense",
    amount: num(data.amount),
    category: data.category || "Outros",
    description: data.description,
    occurredAt: data.occurred_at,
    productId: data.product_id,
  } as CashTransaction;
}

export async function registerStockMovement(input: { productId: string; kind: "in" | "out" | "adjustment"; quantity: number; note?: string }) {
  const { data, error } = await supabase.rpc("register_stock_movement", {
    p_product_id: input.productId,
    p_kind: input.kind,
    p_quantity: input.quantity,
    p_note: input.note || null,
  });
  if (error) throw error;
  return num(data);
}

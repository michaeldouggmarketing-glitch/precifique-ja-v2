"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  ImagePlus,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import {
  registerProductWithAssistant,
  uploadProductImage,
  type V2Plan,
  type WorkspaceProduct,
} from "../lib/workspace";

type Props = {
  open: boolean;
  onClose: () => void;
  plan: V2Plan;
  credits: number;
  authenticated: boolean;
  onCreditsChange: (credits: number) => void;
  onProductRegistered: (product: WorkspaceProduct) => void;
};

const MONEY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (v: number) => MONEY.format(Number.isFinite(v) ? v : 0);
const pct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1).replace(".", ",")}%`;
const decimal = (raw: string) => Number(raw.replace(/\./g, "").replace(",", ".")) || 0;

const fallbackImage = "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=88";

export default function AssistantModalV2({
  open,
  onClose,
  plan,
  credits,
  authenticated,
  onCreditsChange,
  onProductRegistered,
}: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Doces");
  const [ingredients, setIngredients] = useState("");
  const [packaging, setPackaging] = useState("");
  const [labor, setLabor] = useState("");
  const [fixed, setFixed] = useState("");
  const [fees, setFees] = useState("");
  const [losses, setLosses] = useState("");
  const [price, setPrice] = useState("");
  const [targetMargin, setTargetMargin] = useState(58);
  const [volume, setVolume] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ingredientsN = decimal(ingredients);
  const packagingN = decimal(packaging);
  const laborN = decimal(labor);
  const fixedN = decimal(fixed);
  const feesN = decimal(fees);
  const lossesN = decimal(losses);
  const priceN = decimal(price);
  const totalCost = ingredientsN + packagingN + laborN + fixedN + feesN + lossesN;
  const currentMargin = priceN > 0 ? ((priceN - totalCost) / priceN) * 100 : 0;
  const ideal = totalCost / Math.max(0.05, 1 - targetMargin / 100);
  const monthlyImpact = Math.max(0, ideal - priceN) * (Number(volume) || 0);

  const costItems = useMemo(() => [
    { name: "Ingredientes", quantity: 1, unitCost: ingredientsN, category: "ingredient" },
    { name: "Embalagem", quantity: 1, unitCost: packagingN, category: "packaging" },
    { name: "Mão de obra", quantity: 1, unitCost: laborN, category: "labor" },
    { name: "Custos fixos rateados", quantity: 1, unitCost: fixedN, category: "fixed" },
    { name: "Taxas e comissões", quantity: 1, unitCost: feesN, category: "fees" },
    { name: "Perdas", quantity: 1, unitCost: lossesN, category: "losses" },
  ].filter((item) => item.unitCost > 0), [ingredientsN, packagingN, laborN, fixedN, feesN, lossesN]);

  if (!open) return null;
  const exhausted = credits <= 0;

  const selectImage = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A foto precisa ter até 5 MB.");
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const reset = () => {
    setStep(0); setName(""); setCategory("Doces"); setIngredients(""); setPackaging("");
    setLabor(""); setFixed(""); setFees(""); setLosses(""); setPrice(""); setTargetMargin(58);
    setVolume(""); setStock(""); setMinStock(""); setImageFile(null); setImagePreview("");
    setCompleted(false); setSaving(false); setError("");
  };

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      let imageUrl = imagePreview || fallbackImage;
      if (authenticated && imageFile) imageUrl = await uploadProductImage(imageFile);

      if (authenticated) {
        const result = await registerProductWithAssistant({
          name,
          category,
          salePrice: priceN,
          targetMargin,
          currentStock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
          monthlySales: Number(volume) || 0,
          imageUrl,
          sku: `PJ-${Date.now().toString().slice(-6)}`,
          costItems,
        });
        if (!result) throw new Error("Não foi possível concluir o cadastro.");
        onCreditsChange(result.remaining_total);
        onProductRegistered({
          id: result.product_id,
          name,
          category,
          image: imageUrl,
          price: priceN,
          cost: totalCost,
          targetMargin,
          monthlySales: Number(volume) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
          sku: `PJ-${Date.now().toString().slice(-6)}`,
        });
      } else {
        const demoId = `demo-${Date.now()}`;
        onCreditsChange(Math.max(0, credits - 1));
        onProductRegistered({
          id: demoId,
          name,
          category,
          image: imageUrl,
          price: priceN,
          cost: totalCost,
          targetMargin,
          monthlySales: Number(volume) || 0,
          stock: Number(stock) || 0,
          minStock: Number(minStock) || 0,
          sku: `DEMO-${String(Date.now()).slice(-4)}`,
        });
      }
      setCompleted(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível concluir o cadastro.";
      setError(message.includes("assistant_credit_exhausted") ? "Seus cadastros assistidos acabaram." : message);
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      title: "Vamos começar pelo produto.",
      body: "Dê um nome claro e escolha a categoria. A foto ajuda o catálogo a ficar visual e mais fácil de operar.",
      valid: name.trim().length > 1,
      input: <div className="assistant-form-stack">
        <label>Nome do produto<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Bolo de Chocolate 1kg" /></label>
        <label>Categoria<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Doces</option><option>Bolos artesanais</option><option>Sobremesas</option><option>Cupcakes</option><option>Salgados</option><option>Bebidas</option><option>Serviços</option><option>Outros</option></select></label>
        <label className="photo-field"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => selectImage(e.target.files?.[0])} /><span className="photo-preview">{imagePreview ? <img src={imagePreview} alt="Prévia" /> : <ImagePlus size={24} />}</span><span><strong>{imageFile ? "Trocar foto" : "Adicionar foto do produto"}</strong><small>JPG, PNG ou WEBP · até 5 MB</small></span><Camera size={18} /></label>
      </div>,
    },
    {
      title: "Quanto vai de ingredientes por unidade?",
      body: "Some apenas o que entra na receita de uma unidade. Depois o PrecifiqueJá separa esse bloco dos demais custos.",
      valid: ingredientsN > 0,
      input: <MoneyField label="Ingredientes por unidade" value={ingredients} onChange={setIngredients} />,
    },
    {
      title: "Agora vamos fechar os custos que muita gente esquece.",
      body: "Embalagem, mão de obra e custos fixos rateados entram no custo completo — não só a matéria-prima.",
      valid: packagingN >= 0 && laborN >= 0 && fixedN >= 0,
      input: <div className="assistant-form-grid"><MoneyField label="Embalagem" value={packaging} onChange={setPackaging} /><MoneyField label="Mão de obra" value={labor} onChange={setLabor} /><MoneyField label="Fixos rateados" value={fixed} onChange={setFixed} /></div>,
    },
    {
      title: "Existem taxas, comissões ou perdas?",
      body: "Inclua o que costuma reduzir seu resultado por unidade. Se não houver, deixe zero.",
      valid: feesN >= 0 && lossesN >= 0,
      input: <div className="assistant-form-grid"><MoneyField label="Taxas/comissões" value={fees} onChange={setFees} /><MoneyField label="Perdas médias" value={losses} onChange={setLosses} /></div>,
    },
    {
      title: "Por quanto você vende hoje?",
      body: "Com o preço atual eu comparo CMV, margem real e o preço necessário para atingir sua meta.",
      valid: priceN > 0,
      input: <div className="assistant-form-stack"><MoneyField label="Preço atual" value={price} onChange={setPrice} /><label>Margem desejada <b>{targetMargin}%</b><input type="range" min="25" max="80" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} /><span className="assistant-range-labels"><small>25%</small><small>Meta escolhida</small><small>80%</small></span></label></div>,
    },
    {
      title: "Qual é o ritmo desse produto?",
      body: "Volume e estoque deixam a recomendação mais útil: preço, impacto mensal e reposição passam a conversar entre si.",
      valid: Number(volume) > 0,
      input: <div className="assistant-form-grid three"><label>Vendas/mês<input value={volume} onChange={(e) => setVolume(e.target.value)} inputMode="numeric" placeholder="80" /></label><label>Estoque atual<input value={stock} onChange={(e) => setStock(e.target.value)} inputMode="numeric" placeholder="12" /></label><label>Estoque mínimo<input value={minStock} onChange={(e) => setMinStock(e.target.value)} inputMode="numeric" placeholder="8" /></label></div>,
    },
    {
      title: "Revise antes de cadastrar.",
      body: "Aqui está a leitura que vai entrar no catálogo. O crédito só é consumido quando você confirmar.",
      valid: true,
      input: <div className="assistant-review-v2">
        <div className="review-product"><span className="review-image">{imagePreview ? <img src={imagePreview} alt="" /> : <Package size={22} />}</span><div><span>{category}</span><strong>{name || "Produto"}</strong><small>{Number(volume) || 0} vendas/mês · estoque {Number(stock) || 0}</small></div></div>
        <div className="review-kpis"><div><span>Custo completo</span><strong>{money(totalCost)}</strong></div><div><span>Preço atual</span><strong>{money(priceN)}</strong></div><div><span>Margem atual</span><strong>{pct(currentMargin)}</strong></div><div className="accent"><span>Preço ideal</span><strong>{money(ideal)}</strong></div></div>
        <div className="review-impact"><Sparkles size={17} /><div><strong>{monthlyImpact > 1 ? `Existe até ${money(monthlyImpact)}/mês de oportunidade no mesmo volume.` : "Seu preço está próximo da meta definida."}</strong><span>Meta de margem: {targetMargin}% · CMV alvo: {100 - targetMargin}%</span></div></div>
      </div>,
    },
  ];

  const current = steps[step];
  const checkoutUrl = process.env.NEXT_PUBLIC_ASSISTANT_CREDITS_CHECKOUT_URL || "";
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.currentTarget === e.target) onClose(); }}>
      <section className="assistant-modal assistant-modal-v2">
        <header className="assistant-modal-head">
          <div className="assistant-person"><div className="assistant-avatar"><Sparkles size={20}/></div><div><span>Assistente PrecifiqueJá V2</span><strong>Cadastro, custo e precificação guiados</strong><small>Dados exclusivos do PrecifiqueJá V2</small></div></div>
          <button className="icon-button plain" onClick={onClose} aria-label="Fechar"><X size={20}/></button>
        </header>

        {exhausted && !completed ? (
          <div className="upsell-state">
            <div className="upsell-icon"><Crown size={28}/></div>
            <span className="eyebrow">Seus cadastros incluídos acabaram</span>
            <h2>Continue cadastrando sem perder o ritmo.</h2>
            <p>Adicione mais <b>20 cadastros assistidos</b> ao seu PrecifiqueJá V2.</p>
            <div className="upsell-price"><strong>R$ 17</strong><span>pagamento único</span></div>
            <div className="upsell-benefits"><span><CheckCircle2 size={15}/> 20 novos cadastros</span><span><CheckCircle2 size={15}/> seus dados continuam no mesmo catálogo</span><span><CheckCircle2 size={15}/> funciona no Básico e no Premium</span></div>
            {checkoutUrl ? <a className="lime-action full link-button" href={checkoutUrl}>Comprar +20 cadastros <ArrowUpRight size={16}/></a> : <button className="lime-action full" disabled={!isDev} onClick={() => isDev && onCreditsChange(20)}>{isDev ? "Simular pacote +20 no preview" : "Checkout em configuração"}</button>}
            <small className="upsell-note">Créditos pagos serão liberados somente após confirmação do checkout.</small>
          </div>
        ) : completed ? (
          <div className="assistant-complete">
            <div className="complete-check"><CheckCircle2 size={34}/></div>
            <span className="eyebrow">Cadastro concluído</span>
            <h2>{name || "Produto"} entrou no catálogo.</h2>
            <p>Custo completo, preço, margem, estoque e impacto já foram organizados.</p>
            <div className="assistant-result-grid"><div><span>Custo</span><strong>{money(totalCost)}</strong></div><div><span>Preço</span><strong>{money(priceN)}</strong></div><div><span>Preço ideal</span><strong>{money(ideal)}</strong></div><div><span>Cadastros restantes</span><strong>{credits}</strong></div></div>
            <div className="assistant-complete-actions"><button className="ghost-action" onClick={reset}>Cadastrar outro</button><button className="primary-action" onClick={onClose}>Ver no catálogo</button></div>
          </div>
        ) : (
          <>
            <div className="assistant-progress"><div><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><small>Etapa {step + 1} de {steps.length} · {credits} cadastro{credits === 1 ? " disponível" : "s disponíveis"} · plano {plan === "premium" ? "Premium" : "Básico"}</small></div>
            <main className="assistant-chat">
              <div className="assistant-bubble"><div className="bubble-avatar"><Sparkles size={15}/></div><div><strong>{current.title}</strong><p>{current.body}</p></div></div>
              <div className="assistant-input-card">{current.input}</div>
              {step >= 4 && step < 6 && <div className="assistant-preview-card rich"><span>Leitura ao vivo</span><div><strong>Custo completo</strong><b>{money(totalCost)}</b></div><div><strong>Margem atual</strong><b>{pct(currentMargin)}</b></div><div><strong>Preço ideal</strong><b>{money(ideal)}</b></div></div>}
              {error && <div className="assistant-error">{error}</div>}
            </main>
            <footer className="assistant-footer"><button disabled={step === 0 || saving} className="ghost-action" onClick={() => setStep(Math.max(0, step - 1))}>Voltar</button>{step < steps.length - 1 ? <button disabled={!current.valid || saving} className="primary-action" onClick={() => setStep(step + 1)}>Continuar <ChevronRight size={16}/></button> : <button disabled={saving} className="lime-action" onClick={finish}><Sparkles size={16}/> {saving ? "Cadastrando..." : "Confirmar e cadastrar"}</button>}</footer>
          </>
        )}
      </section>
    </div>
  );
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label>{label}<div className="assistant-money-input"><span>R$</span><input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" placeholder="0,00" /></div></label>;
}

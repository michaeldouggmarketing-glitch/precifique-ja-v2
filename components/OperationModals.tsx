"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Boxes, CheckCircle2, X } from "lucide-react";
import { addCashTransaction, registerStockMovement, type CashTransaction, type WorkspaceProduct } from "../lib/workspace";

type CashModalProps = {
  open: boolean;
  onClose: () => void;
  authenticated: boolean;
  businessId: string | null;
  products: WorkspaceProduct[];
  onCreated: (transaction: CashTransaction) => void;
};

type StockModalProps = {
  open: boolean;
  onClose: () => void;
  authenticated: boolean;
  products: WorkspaceProduct[];
  onUpdated: (productId: string, stock: number) => void;
};

const today = () => new Date().toISOString().slice(0, 10);
const decimal = (value: string) => Number(value.replace(/\./g, "").replace(",", ".")) || 0;

export function CashEntryModal({ open, onClose, authenticated, businessId, products, onCreated }: CashModalProps) {
  const [kind, setKind] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Vendas");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(today());
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const amountN = decimal(amount);
  const categories = kind === "income" ? ["Vendas", "Serviços", "Outras entradas"] : ["Ingredientes", "Embalagem", "Taxas", "Marketing", "Aluguel", "Outras saídas"];

  if (!open) return null;
  const save = async () => {
    if (amountN <= 0 || description.trim().length < 2) return;
    setSaving(true); setError("");
    try {
      const input = { businessId, kind, amount: amountN, category, description: description.trim(), occurredAt, productId: productId || null };
      const tx = authenticated ? await addCashTransaction(input) : { id: `demo-cash-${Date.now()}`, kind, amount: amountN, category, description: description.trim(), occurredAt, productId: productId || null } as CashTransaction;
      onCreated(tx);
      onClose();
      setAmount(""); setDescription(""); setProductId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar o lançamento.");
    } finally { setSaving(false); }
  };

  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)onClose()}}><section className="operation-modal">
    <header><div><span className="eyebrow">Caixa</span><h2>Novo lançamento</h2><p>Registre a movimentação e mantenha o painel atualizado.</p></div><button className="icon-button plain" onClick={onClose}><X size={19}/></button></header>
    <div className="kind-switch"><button className={kind==="income"?"active income":""} onClick={()=>{setKind("income");setCategory("Vendas")}}><ArrowDownRight size={16}/> Entrada</button><button className={kind==="expense"?"active expense":""} onClick={()=>{setKind("expense");setCategory("Ingredientes")}}><ArrowUpRight size={16}/> Saída</button></div>
    <div className="operation-form">
      <label>Valor<div className="assistant-money-input"><span>R$</span><input autoFocus value={amount} onChange={(e)=>setAmount(e.target.value)} inputMode="decimal" placeholder="0,00"/></div></label>
      <label>Descrição<input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Ex.: Venda balcão · pedido #1052"/></label>
      <div className="operation-form-grid"><label>Categoria<select value={category} onChange={(e)=>setCategory(e.target.value)}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><label>Data<input type="date" value={occurredAt} onChange={(e)=>setOccurredAt(e.target.value)}/></label></div>
      <label>Produto relacionado <span className="optional">opcional</span><select value={productId} onChange={(e)=>setProductId(e.target.value)}><option value="">Nenhum produto específico</option>{products.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      {error&&<div className="assistant-error full-error">{error}</div>}
    </div>
    <footer><button className="ghost-action" onClick={onClose}>Cancelar</button><button className="primary-action" disabled={saving||amountN<=0||description.trim().length<2} onClick={save}>{saving?"Salvando...":"Salvar lançamento"}<CheckCircle2 size={16}/></button></footer>
  </section></div>;
}

export function StockMovementModal({ open, onClose, authenticated, products, onUpdated }: StockModalProps) {
  const [productId, setProductId] = useState(products[0]?.id || "");
  const [kind, setKind] = useState<"in" | "out" | "adjustment">("in");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const product = useMemo(()=>products.find((p)=>p.id===productId)||products[0],[products,productId]);
  const qty = decimal(quantity);
  if (!open) return null;
  if (!product) return <div className="modal-backdrop"><section className="operation-modal"><header><div><span className="eyebrow">Estoque</span><h2>Cadastre um produto primeiro</h2></div><button className="icon-button plain" onClick={onClose}><X size={19}/></button></header></section></div>;
  const preview = kind === "in" ? product.stock + qty : kind === "out" ? Math.max(0, product.stock - qty) : qty;
  const save = async () => {
    if (qty <= 0) return;
    setSaving(true); setError("");
    try {
      const newStock = authenticated ? await registerStockMovement({ productId: product.id, kind, quantity: qty, note }) : preview;
      onUpdated(product.id, newStock);
      onClose(); setQuantity(""); setNote("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível movimentar o estoque."); }
    finally { setSaving(false); }
  };
  return <div className="modal-backdrop" onMouseDown={(e)=>{if(e.currentTarget===e.target)onClose()}}><section className="operation-modal">
    <header><div><span className="eyebrow">Estoque</span><h2>Registrar movimentação</h2><p>Entrada, saída ou ajuste manual com atualização imediata do saldo.</p></div><button className="icon-button plain" onClick={onClose}><X size={19}/></button></header>
    <div className="operation-form">
      <label>Produto<select value={product.id} onChange={(e)=>setProductId(e.target.value)}>{products.map((p)=><option value={p.id} key={p.id}>{p.name} · {p.stock} un.</option>)}</select></label>
      <div className="kind-switch stock"><button className={kind==="in"?"active":""} onClick={()=>setKind("in")}>Entrada</button><button className={kind==="out"?"active":""} onClick={()=>setKind("out")}>Saída</button><button className={kind==="adjustment"?"active":""} onClick={()=>setKind("adjustment")}>Ajuste</button></div>
      <label>{kind==="adjustment"?"Novo saldo":"Quantidade"}<input autoFocus value={quantity} onChange={(e)=>setQuantity(e.target.value)} inputMode="decimal" placeholder="0"/></label>
      <label>Observação <span className="optional">opcional</span><input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Ex.: reposição do fornecedor"/></label>
      <div className="stock-preview-card"><div className="stock-preview-icon"><Boxes size={19}/></div><span>Saldo atual <b>{product.stock}</b></span><span>Depois <b>{preview}</b></span></div>
      {error&&<div className="assistant-error full-error">{error}</div>}
    </div>
    <footer><button className="ghost-action" onClick={onClose}>Cancelar</button><button className="primary-action" disabled={saving||qty<=0} onClick={save}>{saving?"Salvando...":"Confirmar movimentação"}<CheckCircle2 size={16}/></button></footer>
  </section></div>;
}

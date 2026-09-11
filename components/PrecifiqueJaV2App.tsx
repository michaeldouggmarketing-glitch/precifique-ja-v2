"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  Calculator,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Crown,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CircleAlert,
  CheckCircle2,
  WandSparkles,
  ShoppingBag,
  BarChart3,
  ReceiptText,
  LogOut,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { loadWorkspace, signOutV2, updateProductSalePrice, type CashTransaction, type WorkspaceProduct } from "../lib/workspace";
import AssistantModalV2 from "./AssistantModalV2";
import AuthGateV2 from "./AuthGateV2";
import { CashEntryModal, StockMovementModal } from "./OperationModals";

type Screen = "painel" | "produtos" | "cmv" | "estoque" | "caixa" | "precificacao";
type Plan = "basic" | "premium";

type Product = {
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

const DEMO_PRODUCTS: Product[] = [
  {
    id: "bolo-chocolate",
    name: "Bolo de Chocolate",
    category: "Bolos artesanais",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=88",
    price: 89.9,
    cost: 39.86,
    targetMargin: 58,
    monthlySales: 46,
    stock: 12,
    minStock: 8,
    sku: "BOL-001",
  },
  {
    id: "brigadeiro",
    name: "Brigadeiro Gourmet",
    category: "Doces",
    image: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&w=1200&q=88",
    price: 3.5,
    cost: 1.48,
    targetMargin: 62,
    monthlySales: 420,
    stock: 68,
    minStock: 80,
    sku: "DOC-014",
  },
  {
    id: "torta-pote",
    name: "Torta no Pote",
    category: "Sobremesas",
    image: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=88",
    price: 14.9,
    cost: 6.72,
    targetMargin: 58,
    monthlySales: 175,
    stock: 34,
    minStock: 24,
    sku: "SOB-021",
  },
  {
    id: "cupcake",
    name: "Cupcake Red Velvet",
    category: "Cupcakes",
    image: "https://images.unsplash.com/photo-1587668178277-295251f900ce?auto=format&fit=crop&w=1200&q=88",
    price: 12,
    cost: 5.9,
    targetMargin: 55,
    monthlySales: 118,
    stock: 9,
    minStock: 18,
    sku: "CUP-008",
  },
  {
    id: "brownie",
    name: "Brownie Premium",
    category: "Doces",
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=88",
    price: 16.9,
    cost: 6.1,
    targetMargin: 60,
    monthlySales: 132,
    stock: 41,
    minStock: 20,
    sku: "DOC-031",
  },
  {
    id: "cheesecake",
    name: "Cheesecake Frutas Vermelhas",
    category: "Sobremesas",
    image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=88",
    price: 109.9,
    cost: 48.2,
    targetMargin: 58,
    monthlySales: 29,
    stock: 5,
    minStock: 6,
    sku: "SOB-037",
  },
];

const DEMO_CASH_TRANSACTIONS: CashTransaction[] = [
  { id: "demo-1", kind: "income", amount: 248.5, category: "Vendas", description: "Venda balcão · pedido #1048", occurredAt: "2026-09-10" },
  { id: "demo-2", kind: "expense", amount: 386.2, category: "Ingredientes", description: "Fornecedor Chocolates Sul", occurredAt: "2026-09-10" },
  { id: "demo-3", kind: "income", amount: 420, category: "Vendas", description: "Venda encomenda · bolo aniversário", occurredAt: "2026-09-09" },
  { id: "demo-4", kind: "expense", amount: 129.9, category: "Embalagem", description: "Embalagens e etiquetas", occurredAt: "2026-09-09" },
  { id: "demo-5", kind: "income", amount: 312.4, category: "Vendas", description: "Venda iFood", occurredAt: "2026-09-09" },
];

const MONEY = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (value: number) => MONEY.format(value);
const pct = (value: number) => `${value.toFixed(1).replace(".", ",")}%`;

function idealPrice(product: Product, margin = product.targetMargin) {
  return product.cost / Math.max(0.01, 1 - margin / 100);
}

function productMargin(product: Product) {
  return ((product.price - product.cost) / Math.max(product.price, 0.01)) * 100;
}

function productCmv(product: Product) {
  return (product.cost / Math.max(product.price, 0.01)) * 100;
}

const NAV = [
  { key: "painel" as const, label: "Painel", icon: LayoutDashboard },
  { key: "produtos" as const, label: "Produtos", icon: Package },
  { key: "cmv" as const, label: "CMV", icon: BarChart3 },
  { key: "estoque" as const, label: "Estoque", icon: Boxes },
  { key: "caixa" as const, label: "Caixa", icon: WalletCards },
  { key: "precificacao" as const, label: "Precificação", icon: Calculator },
];

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><Zap size={18} strokeWidth={2.8} /></div>
      <div>
        <strong>PrecifiqueJá</strong>
        <span>V2 · Novo Oficial</span>
      </div>
    </div>
  );
}

function Sidebar({ screen, setScreen, onAssistant, plan, credits }: { screen: Screen; setScreen: (s: Screen) => void; onAssistant: () => void; plan: Plan; credits: number }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <nav className="side-nav">
          <p className="nav-section-label">Visão do negócio</p>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`nav-item ${screen === key ? "active" : ""}`} onClick={() => setScreen(key)}>
              <Icon size={18} />
              <span>{label}</span>
              {screen === key && <span className="active-dot" />}
            </button>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <button className="assistant-mini-card" onClick={onAssistant}>
          <div className="assistant-mini-top">
            <div className="assistant-orb"><WandSparkles size={17} /></div>
            <div>
              <span>Assistente V2</span>
              <strong>{credits} cadastro{credits === 1 ? " disponível" : "s disponíveis"}</strong>
            </div>
          </div>
          <div className="assistant-credit-track"><span style={{ width: `${Math.min(100, (credits / (plan === "premium" ? 7 : 1)) * 100)}%` }} /></div>
          <small>{plan === "premium" ? "Premium inclui 7 cadastros" : "Básico inclui 1 cadastro"}</small>
        </button>

        <div className="profile-card">
          <div className="avatar">MD</div>
          <div className="profile-copy">
            <strong>Meu negócio</strong>
            <span className={`plan-badge ${plan}`}><Crown size={11} /> {plan === "premium" ? "Premium" : "Básico"}</span>
          </div>
          <Settings size={17} className="muted-icon" />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ screen, onAssistant, onMobileMenu, businessName, onSignOut, authenticated }: { screen: Screen; onAssistant: () => void; onMobileMenu: () => void; businessName: string; onSignOut: () => void; authenticated: boolean }) {
  const title = NAV.find((n) => n.key === screen)?.label ?? "Painel";
  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMobileMenu} aria-label="Abrir menu"><Menu size={21} /></button>
      <div className="topbar-title">
        <span>PrecifiqueJá V2</span>
        <strong>{title}</strong>
      </div>
      <div className="topbar-search"><Search size={17} /><input placeholder="Buscar produtos, lançamentos..." /></div>
      <div className="topbar-actions">
        <button className="assistant-top-button" onClick={onAssistant}><Sparkles size={16} /> <span>Assistente</span></button>
        <button className="icon-button"><Bell size={18} /><i /></button>
        <button className="business-switch" title={businessName}><div className="mini-avatar">{businessName.slice(0,2).toUpperCase()}</div><span>{businessName}</span><ChevronDown size={14} /></button>
        {authenticated && <button className="icon-button" onClick={onSignOut} aria-label="Sair"><LogOut size={17}/></button>}
      </div>
    </header>
  );
}

function MetricCard({ label, value, detail, trend, tone = "default", icon: Icon }: { label: string; value: string; detail: string; trend?: string; tone?: "default" | "hero" | "warning"; icon: React.ComponentType<{ size?: number }>; }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-head"><span>{label}</span><div className="metric-icon"><Icon size={17} /></div></div>
      <strong>{value}</strong>
      <div className="metric-foot"><span>{detail}</span>{trend && <b><TrendingUp size={12} />{trend}</b>}</div>
    </article>
  );
}

function Sparkline() {
  return (
    <svg viewBox="0 0 420 130" className="sparkline" role="img" aria-label="Evolução do lucro no período">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity=".24" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 106 C35 94,42 97,72 82 S118 76,146 88 S201 62,227 60 S279 42,305 53 S357 23,420 29 L420 130 L0 130 Z" fill="url(#area)" />
      <path d="M0 106 C35 94,42 97,72 82 S118 76,146 88 S201 62,227 60 S279 42,305 53 S357 23,420 29" fill="none" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
      {[72,146,227,305,420].map((x, i) => <circle key={x} cx={x} cy={[82,88,60,53,29][i]} r="5" fill="#fff" stroke="#059669" strokeWidth="3" />)}
    </svg>
  );
}

function DashboardScreen({ products, transactions, onGoProducts, onGoCmv, onAssistant }: { products: Product[]; transactions: CashTransaction[]; onGoProducts: () => void; onGoCmv: () => void; onAssistant: () => void }) {
  const opportunity = products.reduce((sum, p) => sum + Math.max(0, idealPrice(p) - p.price) * p.monthlySales, 0);
  const revenue = transactions.filter((t)=>t.kind==="income").reduce((sum,t)=>sum+t.amount,0);
  const expenses = transactions.filter((t)=>t.kind==="expense").reduce((sum,t)=>sum+t.amount,0);
  const balance = revenue-expenses;
  const avgCmv = products.length ? products.reduce((s,p)=>s+productCmv(p),0)/products.length : 0;
  const avgMargin = products.length ? products.reduce((s,p)=>s+productMargin(p),0)/products.length : 0;
  const incomeCount = transactions.filter((t)=>t.kind==="income").length;
  const ticket = incomeCount ? revenue/incomeCount : 0;
  const attention = products.filter((p)=>productMargin(p)<p.targetMargin-2 || p.stock<p.minStock).length;
  const health = products.length ? Math.max(0,Math.min(100,Math.round(100-avgCmv + Math.min(20,avgMargin/4) - attention*2))) : 0;
  return (
    <div className="screen-stack">
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Visão geral do negócio</span>
          <h1>Seu negócio hoje <span>está saudável.</span></h1>
          <p>Preço, margem, estoque e caixa em uma leitura executiva — sem precisar caçar números em várias telas.</p>
        </div>
        <div className="heading-actions">
          <button className="ghost-action">Últimos 30 dias <ChevronDown size={15} /></button>
          <button className="primary-action" onClick={onAssistant}><Sparkles size={16} /> Cadastrar com Assistante</button>
        </div>
      </section>

      <section className="health-hero-grid">
        <article className="health-card">
          <div className="health-copy">
            <span className="eyebrow light">Saúde do negócio</span>
            <div className="health-score-row"><strong>{health}</strong><span>/100</span></div>
            <p>{products.length ? attention ? `Há ${attention} ${attention===1?"ponto":"pontos"} pedindo atenção entre margem e estoque.` : "Seu catálogo está em uma faixa saudável. Continue acompanhando margem e giro." : "Cadastre produtos e lançamentos para formar a leitura real do negócio."}</p>
            <div className="health-chip"><CheckCircle2 size={14} /> {products.length ? "Leitura baseada no seu catálogo" : "Aguardando seus dados"}</div>
          </div>
          <div className="health-ring"><span>{health}</span><small>{health>=80?"Excelente":health>=65?"Saudável":health>=45?"Atenção":"Começando"}</small></div>
        </article>
        <article className="profit-card">
          <div className="profit-top">
            <div><span>Resultado registrado no caixa</span><strong>{money(balance)}</strong><b className={balance>=0?"":"danger-text"}>{balance>=0?<TrendingUp size={13}/>:<TrendingDown size={13}/>} {transactions.length} movimentações no período</b></div>
            <div className="period-tabs"><button>7d</button><button className="active">30d</button><button>Mês</button></div>
          </div>
          <Sparkline />
          <div className="profit-bottom"><span><i className="dot green" /> Resultado</span><span>Entradas: <b>{money(revenue)}</b></span></div>
        </article>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Entradas" value={money(revenue)} detail={`${incomeCount} lançamentos de entrada`} tone="hero" icon={CircleDollarSign} />
        <MetricCard label="Saídas" value={money(expenses)} detail="despesas registradas" icon={TrendingDown} />
        <MetricCard label="CMV médio" value={pct(avgCmv)} detail={products.length?"média do catálogo":"sem produtos"} tone={avgCmv>45?"warning":"default"} icon={BarChart3} />
        <MetricCard label="Margem média" value={pct(avgMargin)} detail="média dos produtos" icon={TrendingUp} />
        <MetricCard label="Ticket médio" value={money(ticket)} detail="por entrada registrada" icon={ReceiptText} />
        <MetricCard label="Produtos ativos" value={String(products.length)} detail={`${attention} pedem atenção`} icon={Package} />
      </section>

      <section className="dashboard-lower-grid">
        <article className="insight-panel premium-panel">
          <div className="panel-head"><div><span className="eyebrow light">Inteligência do negócio</span><h2>Onde está seu próximo ganho de margem</h2></div><div className="ai-pill"><Sparkles size={14}/> Leitura automática</div></div>
          <div className="insight-highlight">
            <div className="insight-orb"><ArrowUpRight size={22} /></div>
            <div><span>Oportunidade estimada</span><strong>{money(opportunity)}/mês</strong><p>se os itens abaixo chegarem ao preço sugerido sem perda de volume.</p></div>
          </div>
          <div className="insight-list">
            {products.slice(0, 3).map((p) => {
              const ideal = idealPrice(p);
              return <button key={p.id} onClick={onGoProducts} className="insight-product-row"><img src={p.image} alt="" /><div><strong>{p.name}</strong><span>{money(p.price)} atual → {money(ideal)} ideal</span></div><b>+{money(Math.max(0, ideal - p.price) * p.monthlySales)}</b><ChevronRight size={16}/></button>
            })}
          </div>
        </article>

        <div className="right-stack">
          <article className="action-panel">
            <div className="panel-head compact"><div><span className="eyebrow">Próximas ações</span><h3>O que merece atenção agora</h3></div></div>
            <button className="action-row warning" onClick={onGoCmv}><div><CircleAlert size={18}/></div><span><strong>CMV acima da meta</strong><small>3 produtos passaram de 48%</small></span><ChevronRight size={16}/></button>
            <button className="action-row"><div><Boxes size={18}/></div><span><strong>Reposição de estoque</strong><small>2 itens abaixo do mínimo</small></span><ChevronRight size={16}/></button>
            <button className="action-row" onClick={onAssistant}><div><WandSparkles size={18}/></div><span><strong>Novo produto</strong><small>Cadastre guiado pela Assistente V2</small></span><ChevronRight size={16}/></button>
          </article>
          <article className="quick-panel">
            <span className="eyebrow">Atalhos rápidos</span>
            <div className="quick-grid"><button onClick={onAssistant}><Plus size={18}/><span>Novo produto</span></button><button><WalletCards size={18}/><span>Lançar caixa</span></button><button onClick={onGoCmv}><BarChart3 size={18}/><span>Analisar CMV</span></button><button><Boxes size={18}/><span>Ver estoque</span></button></div>
          </article>
        </div>
      </section>
    </div>
  );
}

function EmptyProducts({ onAssistant }: { onAssistant?: () => void }) {
  return (
    <section className="empty-products premium-panel">
      <div className="empty-products-icon"><Package size={30} /></div>
      <span className="eyebrow light">Seu catálogo começa aqui</span>
      <h2>Cadastre o primeiro produto com custo, margem e preço ideal já organizados.</h2>
      <p>A Assistente V2 guia o cadastro, calcula o custo completo e entrega a primeira leitura de rentabilidade.</p>
      {onAssistant && <button className="lime-action" onClick={onAssistant}><Sparkles size={16}/> Cadastrar primeiro produto</button>}
    </section>
  );
}

function ProductsScreen({ products, onAssistant }: { products: Product[]; onAssistant: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(products[0]?.id || "");
  useEffect(() => { if (!products.some((p) => p.id === selectedId)) setSelectedId(products[0]?.id || ""); }, [products, selectedId]);
  const selected = products.find((p) => p.id === selectedId) || products[0];
  const filtered = products.filter((p) => `${p.name} ${p.category} ${p.sku}`.toLowerCase().includes(query.toLowerCase()));
  const opportunityCount = products.filter((p) => idealPrice(p) - p.price > 0.1).length;
  const criticalCount = products.filter((p) => productMargin(p) < p.targetMargin - 5).length;
  if (!selected) return <EmptyProducts onAssistant={onAssistant} />;
  const ideal = idealPrice(selected);
  const margin = productMargin(selected);
  const gap = Math.max(0, ideal - selected.price);
  return (
    <div className="screen-stack">
      <section className="page-heading">
        <div><span className="eyebrow">Catálogo inteligente</span><h1>Produtos com <span>decisão embutida.</span></h1><p>Cada item mostra custo, preço, margem, CMV, estoque e oportunidade em um só lugar.</p></div>
        <button className="primary-action" onClick={onAssistant}><Sparkles size={16}/> Cadastrar com Assistente</button>
      </section>

      <section className="catalog-toolbar">
        <div className="catalog-search"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Buscar produto, categoria ou SKU..." /></div>
        <div className="toolbar-chips"><button className="active">Todos <b>{products.length}</b></button><button>Oportunidades <b>{opportunityCount}</b></button><button>Margem crítica <b>{criticalCount}</b></button></div>
      </section>

      <section className="products-layout">
        <div className="product-grid">
          {filtered.map((p) => {
            const m = productMargin(p);
            const i = idealPrice(p);
            return <article key={p.id} role="button" tabIndex={0} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setSelectedId(p.id)}}} onClick={()=>setSelectedId(p.id)} className={`product-card ${selected.id===p.id?"selected":""}`}> 
              <div className="product-image-wrap"><img src={p.image} alt={p.name}/><span className={m >= p.targetMargin-2 ? "status good" : "status warn"}>{m >= p.targetMargin-2 ? "Saudável" : "Ajustar preço"}</span><button className="image-menu" aria-label="Mais opções">•••</button></div>
              <div className="product-card-body">
                <div className="product-card-title"><div><span>{p.category}</span><strong>{p.name}</strong></div><small>{p.sku}</small></div>
                <div className="price-row"><div><span>Preço atual</span><strong>{money(p.price)}</strong></div><div><span>Preço ideal</span><strong className="green">{money(i)}</strong></div></div>
                <div className="product-mini-metrics"><span>CMV <b>{pct(productCmv(p))}</b></span><span>Margem <b>{pct(m)}</b></span><span>Lucro <b>{money(p.price-p.cost)}</b></span></div>
                <div className="margin-track"><span style={{width:`${Math.min(100,m)}%`}} /></div>
              </div>
            </article>
          })}
        </div>

        <aside className="product-detail-panel">
          <div className="detail-cover"><img src={selected.image} alt={selected.name}/><div className="detail-cover-overlay"><span>{selected.category}</span><h2>{selected.name}</h2><small>{selected.sku}</small></div></div>
          <div className="detail-body">
            <div className="smart-summary"><div className="smart-summary-icon"><Sparkles size={18}/></div><div><span>Resumo inteligente</span><strong>{gap > .1 ? "Seu preço ainda pode trabalhar melhor por você." : "Produto em uma faixa saudável de margem."}</strong><p>{gap > .1 ? `Ajustando para ${money(ideal)}, este item pode recuperar cerca de ${money(gap*selected.monthlySales)} por mês no mesmo volume.` : "Continue acompanhando custo e volume para preservar a margem."}</p></div></div>
            <div className="detail-price-box"><div><span>Custo completo</span><strong>{money(selected.cost)}</strong></div><div><span>Preço atual</span><strong>{money(selected.price)}</strong></div><div className="accent"><span>Preço ideal</span><strong>{money(ideal)}</strong></div></div>
            <div className="detail-stat-grid"><div><span>CMV</span><strong>{pct(productCmv(selected))}</strong><small>quanto do preço vira custo</small></div><div><span>Margem</span><strong>{pct(margin)}</strong><small>meta {pct(selected.targetMargin)}</small></div><div><span>Lucro/un.</span><strong>{money(selected.price-selected.cost)}</strong><small>antes de impostos extras</small></div><div><span>Giro mensal</span><strong>{selected.monthlySales}</strong><small>unidades estimadas</small></div></div>
            <div className="cost-composition"><div className="panel-head compact"><div><span className="eyebrow">Composição do custo</span><h3>Onde o dinheiro do produto está</h3></div></div><div className="composition-bar"><i style={{width:"54%"}}/><i style={{width:"23%"}}/><i style={{width:"13%"}}/><i style={{width:"10%"}}/></div><div className="legend-grid"><span><i className="l1"/>Ingredientes <b>54%</b></span><span><i className="l2"/>Embalagem <b>23%</b></span><span><i className="l3"/>Mão de obra <b>13%</b></span><span><i className="l4"/>Fixos <b>10%</b></span></div></div>
            <button className="primary-action full">Abrir análise completa <ChevronRight size={16}/></button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function CmvScreen({ products }: { products: Product[] }) {
  const rows = [...products].sort((a,b)=>productCmv(b)-productCmv(a));
  if (!rows.length) return <EmptyProducts />;
  const avg = rows.reduce((s,p)=>s+productCmv(p),0)/rows.length;
  return (
    <div className="screen-stack">
      <section className="page-heading"><div><span className="eyebrow">Custos e margem</span><h1>CMV que mostra <span>onde agir primeiro.</span></h1><p>Mais do que uma porcentagem: veja impacto, ranking, tendência e prioridade de correção.</p></div><button className="ghost-action">Últimos 30 dias <ChevronDown size={15}/></button></section>
      <section className="cmv-hero-grid">
        <article className="cmv-score-card"><div className="big-ring"><span>{Math.round(100-avg)}</span><small>Saúde CMV</small></div><div><span className="eyebrow">Leitura do período</span><h2>{pct(avg)} de CMV médio</h2><p>O ideal para seu mix atual é manter o CMV abaixo de 42%. Três produtos puxam a média para cima.</p><div className="cmv-score-actions"><span><CheckCircle2 size={14}/> 3 produtos saudáveis</span><span className="warn"><CircleAlert size={14}/> 3 pedem ajuste</span></div></div></article>
        <article className="cmv-kpis"><div><span>Margem média</span><strong>{pct(100-avg)}</strong><small>+2,4 p.p. no período</small></div><div><span>Markup médio</span><strong>2,16x</strong><small>mix atual</small></div><div><span>Lucro por venda</span><strong>R$ 21,48</strong><small>média ponderada</small></div><div><span>Recuperável</span><strong>R$ 631</strong><small>potencial/mês</small></div></article>
      </section>
      <section className="cmv-content-grid">
        <article className="ranking-panel"><div className="panel-head"><div><span className="eyebrow">Ranking de CMV</span><h2>Produtos que mais pressionam sua margem</h2></div><span className="small-pill">6 analisados</span></div><div className="ranking-list">{rows.map((p,idx)=>{const cmv=productCmv(p);return <div className="ranking-row" key={p.id}><span className="rank-number">{String(idx+1).padStart(2,"0")}</span><img src={p.image} alt=""/><div className="rank-product"><strong>{p.name}</strong><span>{p.category}</span></div><div className="rank-bar"><div><span style={{width:`${Math.min(100,cmv)}%`}} /></div><small>Meta 42%</small></div><strong className={cmv>48?"danger-text":cmv>42?"warning-text":"green-text"}>{pct(cmv)}</strong><span className={`rank-status ${cmv>48?"danger":cmv>42?"warn":"good"}`}>{cmv>48?"Crítico":cmv>42?"Atenção":"Saudável"}</span></div>})}</div></article>
        <article className="recommendation-panel"><div className="ai-header"><div className="assistant-orb"><Sparkles size={18}/></div><div><span>Recomendação inteligente</span><h3>Comece pelo Cupcake Red Velvet</h3></div></div><p>Ele combina CMV alto com volume relevante. Um pequeno ajuste de preço ou custo tende a produzir impacto mais rápido.</p><div className="recommendation-numbers"><div><span>CMV atual</span><strong>49,2%</strong></div><div><span>Meta</span><strong>42,0%</strong></div><div><span>Impacto estimado</span><strong>+ R$ 186/mês</strong></div></div><button className="primary-action full">Ver plano de ação <ArrowUpRight size={16}/></button></article>
      </section>
    </div>
  );
}

function StockScreen({ products, onNew }: { products: Product[]; onNew: () => void }) {
  if (!products.length) return <EmptyProducts />;
  const totalValue = products.reduce((sum,p)=>sum+p.stock*p.cost,0);
  const critical = products.filter(p=>p.stock<p.minStock);
  return (
    <div className="screen-stack">
      <section className="page-heading"><div><span className="eyebrow">Capital em estoque</span><h1>Estoque que mostra <span>dinheiro parado e giro.</span></h1><p>Saiba o que repor, o que vender primeiro e quanto de capital está imobilizado.</p></div><button className="primary-action" onClick={onNew}><Plus size={16}/> Registrar movimentação</button></section>
      <section className="metrics-grid stock-metrics"><MetricCard label="Valor em estoque" value={money(totalValue)} detail="custo imobilizado" icon={Boxes}/><MetricCard label="Abaixo do mínimo" value={`${critical.length} itens`} detail="reposição prioritária" tone="warning" icon={CircleAlert}/><MetricCard label="Giro médio" value="18 dias" detail="-4 dias vs. mês anterior" trend="22%" icon={TrendingUp}/><MetricCard label="Cobertura" value="26 dias" detail="no ritmo atual" icon={Package}/></section>
      <section className="stock-layout"><article className="stock-table-panel"><div className="panel-head"><div><span className="eyebrow">Mapa de estoque</span><h2>Produtos e prioridade de reposição</h2></div><div className="catalog-search small"><Search size={15}/><input placeholder="Buscar item..."/></div></div><div className="stock-cards">{products.map(p=>{const level=p.stock/Math.max(1,p.minStock);return <div className="stock-card" key={p.id}><img src={p.image} alt=""/><div className="stock-card-main"><div><span>{p.category}</span><strong>{p.name}</strong><small>{p.sku}</small></div><div className="stock-values"><span>Saldo <b>{p.stock} un.</b></span><span>Mínimo <b>{p.minStock} un.</b></span><span>Valor <b>{money(p.stock*p.cost)}</b></span></div><div className="stock-progress"><span className={level<1?"low":"ok"} style={{width:`${Math.min(100,level*70)}%`}}/></div></div><div className={`stock-badge ${level<1?"low":"ok"}`}>{level<1?"Repor agora":"Nível saudável"}</div></div>})}</div></article><aside className="stock-intelligence"><div className="ai-header"><div className="assistant-orb"><Sparkles size={18}/></div><div><span>Estoque inteligente</span><h3>R$ 438 podem ser liberados</h3></div></div><p>Seu mix tem itens com cobertura acima do necessário. Priorize a venda desses produtos antes de repor novamente.</p>{products[0] && <div className="stock-tip"><img src={products[0].image} alt=""/><div><strong>{products[0].name}</strong><span>{products[0].stock} un. em estoque · acompanhe o giro</span></div></div>}{products[1] && <div className="stock-tip"><img src={products[1].image} alt=""/><div><strong>{products[1].name}</strong><span>{products[1].stock} un. · compare com o estoque mínimo</span></div></div>}<button className="primary-action full">Abrir plano de giro</button></aside></section>
    </div>
  );
}

function CashScreen({ transactions, onNew }: { transactions: CashTransaction[]; onNew: () => void }) {
  const income = transactions.filter((t)=>t.kind==="income").reduce((sum,t)=>sum+t.amount,0);
  const expense = transactions.filter((t)=>t.kind==="expense").reduce((sum,t)=>sum+t.amount,0);
  const balance = income-expense;
  const expenseByCategory = transactions.filter((t)=>t.kind==="expense").reduce<Record<string,number>>((acc,t)=>{acc[t.category]=(acc[t.category]||0)+t.amount;return acc;},{});
  const categories = Object.entries(expenseByCategory).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCategory = Math.max(1,...categories.map(([,v])=>v));
  const formatDate=(raw:string)=>{const d=new Date(`${raw}T12:00:00`);return Number.isNaN(d.getTime())?raw:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"});};
  return (
    <div className="screen-stack">
      <section className="page-heading"><div><span className="eyebrow">Fluxo financeiro</span><h1>Caixa com <span>contexto para decidir.</span></h1><p>Entradas, saídas, categorias e resultado do período no mesmo lugar.</p></div><div className="heading-actions"><button className="ghost-action">Últimos lançamentos <ChevronDown size={15}/></button><button className="primary-action" onClick={onNew}><Plus size={16}/> Novo lançamento</button></div></section>
      <section className="cash-top-grid">
        <article className="cash-main-card"><div className="cash-summary-head"><div><span>Saldo dos lançamentos</span><strong>{money(balance)}</strong><b className={balance>=0?"":"danger-text"}>{balance>=0?<TrendingUp size={13}/>:<TrendingDown size={13}/>} {transactions.length} movimentações registradas</b></div><div className="period-tabs"><button>7d</button><button className="active">30d</button><button>90d</button></div></div><div className="cash-columns"><div className="cash-bar incoming"><span style={{height:`${income>0?Math.max(18,Math.min(100,(income/Math.max(income,expense,1))*82)):8}%`}}/><small>Entradas</small><strong>{money(income)}</strong></div><div className="cash-bar outgoing"><span style={{height:`${expense>0?Math.max(18,Math.min(100,(expense/Math.max(income,expense,1))*82)):8}%`}}/><small>Saídas</small><strong>{money(expense)}</strong></div><div className="cash-bar profit"><span style={{height:`${balance>0?Math.max(12,Math.min(100,(balance/Math.max(income,1))*82)):8}%`}}/><small>Resultado</small><strong>{money(balance)}</strong></div><div className="cash-bar forecast"><span style={{height:"58%"}}/><small>Movimentos</small><strong>{transactions.length}</strong></div></div></article>
        <article className="cash-insight premium-panel"><div className="ai-header"><div className="assistant-orb"><Sparkles size={18}/></div><div><span>Leitura do caixa</span><h3>{transactions.length?balance>=0?"Seu caixa está positivo no período.":"As saídas estão acima das entradas.":"Seu caixa ainda está vazio."}</h3></div></div><p>{transactions.length?balance>=0?`Você registrou ${money(income)} em entradas e ${money(expense)} em saídas. Continue classificando tudo para enxergar a margem com mais precisão.`:`Faltam ${money(Math.abs(balance))} para as entradas cobrirem as saídas registradas. Reveja as categorias que mais pressionam o caixa.`:"Registre entradas e saídas para transformar esta tela em uma visão real do negócio."}</p><div className="cash-insight-grid"><div><span>Entradas</span><strong>{money(income)}</strong></div><div><span>Saídas</span><strong>{money(expense)}</strong></div></div></article>
      </section>
      <section className="cash-bottom-grid">
        <article className="transactions-panel"><div className="panel-head"><div><span className="eyebrow">Lançamentos recentes</span><h2>Movimentações do caixa</h2></div><button className="text-button" onClick={onNew}>Adicionar</button></div>{transactions.length?<div className="transactions">{transactions.slice(0,8).map((t)=><div className="transaction" key={t.id}><div className={`transaction-icon ${t.kind==="income"?"in":"out"}`}>{t.kind==="income"?<ArrowDownRight size={17}/>:<ArrowUpRight size={17}/>}</div><div className="transaction-copy"><strong>{t.description}</strong><span>{t.category} · {formatDate(t.occurredAt)}</span></div><strong className={t.kind==="income"?"green-text":"danger-text"}>{t.kind==="income"?"+ ":"- "}{money(t.amount)}</strong></div>)}</div>:<div className="empty-list"><WalletCards size={24}/><strong>Nenhum lançamento ainda</strong><span>Comece pela primeira entrada ou saída.</span><button className="primary-action" onClick={onNew}>Novo lançamento</button></div>}</article>
        <article className="category-panel"><div className="panel-head compact"><div><span className="eyebrow">Saídas por categoria</span><h3>Para onde foi o dinheiro</h3></div></div>{categories.length?categories.map(([name,value])=><div className="category-row" key={name}><span>{name}</span><div><i style={{width:`${Math.max(8,(value/maxCategory)*100)}%`}}/></div><b>{expense?Math.round((value/expense)*100):0}%</b></div>):<div className="empty-category">As categorias aparecem conforme você registra despesas.</div>}</article>
      </section>
    </div>
  );
}

function PricingScreen({ products, authenticated, onPriceUpdated }: { products: Product[]; authenticated: boolean; onPriceUpdated: (productId: string, price: number) => void }) {
  const [selectedId,setSelectedId]=useState(products[0]?.id || "");
  const [cost,setCost]=useState(products[0]?.cost || 0);
  const [margin,setMargin]=useState(products[0]?.targetMargin || 55);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  useEffect(() => {
    const exists=products.some((p)=>p.id===selectedId);
    const next=exists?products.find((p)=>p.id===selectedId):products[0];
    if(!next){setSelectedId("");setCost(0);setMargin(55);return;}
    if(!exists)setSelectedId(next.id);
    setCost(next.cost);
    setMargin(next.targetMargin);
  },[products,selectedId]);
  const product=products.find(p=>p.id===selectedId) || products[0];
  if (!product) return <EmptyProducts />;
  const recommended=cost/Math.max(.05,1-margin/100);
  const profit=recommended-cost;
  const markup=cost>0?recommended/cost:0;
  const updateProduct=(id:string)=>{const p=products.find(x=>x.id===id);if(!p)return;setSelectedId(id);setCost(p.cost);setMargin(p.targetMargin);setNotice("");setError("")};
  const applyPrice=async()=>{
    setSaving(true);setError("");setNotice("");
    try{
      if(authenticated)await updateProductSalePrice(product.id,recommended);
      onPriceUpdated(product.id,recommended);
      setNotice(`Preço de ${product.name} atualizado para ${money(recommended)}.`);
    }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar o preço.")}
    finally{setSaving(false)}
  };
  return <div className="screen-stack">
    <section className="page-heading"><div><span className="eyebrow">Precificação inteligente</span><h1>Preço ideal com <span>explicação, não chute.</span></h1><p>Simule custo, margem e lucro. Depois aplique a decisão diretamente ao produto.</p></div></section>
    <section className="pricing-layout">
      <article className="pricing-form-panel"><div className="panel-head"><div><span className="eyebrow">Simulador</span><h2>Monte seu cenário</h2></div><span className="small-pill"><Calculator size={13}/> Tempo real</span></div><label className="field-label">Produto<select value={selectedId} onChange={e=>updateProduct(e.target.value)}>{products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label><div className="pricing-product-preview">{product.image?<img src={product.image} alt=""/>:<div className="product-placeholder"><Package size={23}/></div>}<div><span>{product.category}</span><strong>{product.name}</strong><small>Preço atual: {money(product.price)}</small></div></div><label className="field-label">Custo completo<div className="money-input"><span>R$</span><input type="number" step="0.01" value={cost} onChange={e=>setCost(Math.max(0,Number(e.target.value)))}/></div></label><label className="field-label">Margem desejada <b>{pct(margin)}</b><input type="range" min="20" max="80" step="1" value={margin} onChange={e=>setMargin(Number(e.target.value))}/><div className="range-labels"><span>20%</span><span>50%</span><span>80%</span></div></label><div className="pricing-presets"><span>Atalhos</span>{[35,45,55,60,65].map(v=><button className={margin===v?"active":""} onClick={()=>setMargin(v)} key={v}>{v}%</button>)}</div></article>
      <article className="pricing-result-panel premium-panel"><span className="eyebrow light">Preço recomendado</span><div className="recommended-price"><small>R$</small><strong>{recommended.toFixed(2).replace(".",",")}</strong></div><p>Este valor preserva uma margem de <b>{pct(margin)}</b> considerando o custo informado.</p><div className="pricing-result-grid"><div><span>Lucro/un.</span><strong>{money(profit)}</strong></div><div><span>Markup</span><strong>{markup.toFixed(2).replace(".",",")}x</strong></div><div><span>CMV</span><strong>{pct(100-margin)}</strong></div><div><span>Vs. atual</span><strong className={recommended>product.price?"lime-text":""}>{recommended>product.price?"+":""}{money(recommended-product.price)}</strong></div></div><div className="pricing-explanation"><Sparkles size={18}/><div><strong>Por que este preço?</strong><p>Seu custo representa {pct(100-margin)} do preço final. A diferença cobre margem e dá espaço para absorver pequenas oscilações sem perder rentabilidade.</p></div></div>{notice&&<div className="pricing-notice success"><CheckCircle2 size={15}/>{notice}</div>}{error&&<div className="pricing-notice error">{error}</div>}<button className="lime-action full" disabled={saving||cost<=0} onClick={applyPrice}>{saving?"Aplicando...":"Aplicar ao produto"} <ArrowUpRight size={16}/></button></article>
    </section>
  </div>
}

export default function PrecifiqueJaV2App() {
  const isDev = process.env.NODE_ENV !== "production";
  const [screen,setScreen]=useState<Screen>("painel");
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [cashModalOpen,setCashModalOpen]=useState(false);
  const [stockModalOpen,setStockModalOpen]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [plan,setPlan]=useState<Plan>("premium");
  const [credits,setCredits]=useState(7);
  const [products,setProducts]=useState<Product[]>(DEMO_PRODUCTS);
  const [cashTransactions,setCashTransactions]=useState<CashTransaction[]>(DEMO_CASH_TRANSACTIONS);
  const [businessId,setBusinessId]=useState<string|null>(null);
  const [businessName,setBusinessName]=useState("Doce Arte");
  const [authenticated,setAuthenticated]=useState(false);
  const [workspaceReady,setWorkspaceReady]=useState(false);
  const [showDevAuth,setShowDevAuth]=useState(false);

  const resetDevPreview=()=>{
    setPlan("premium"); setCredits(7); setBusinessName("Doce Arte"); setBusinessId(null);
    setProducts(DEMO_PRODUCTS); setCashTransactions(DEMO_CASH_TRANSACTIONS);
  };

  const refreshWorkspace = async () => {
    try {
      const workspace = await loadWorkspace();
      if (workspace.user) {
        setAuthenticated(true);
        setPlan(workspace.plan);
        setCredits(workspace.credits);
        setBusinessId(workspace.businessId);
        setBusinessName(workspace.businessName || "Meu negócio");
        setProducts(workspace.products as Product[]);
        setCashTransactions(workspace.cashTransactions);
        setShowDevAuth(false);
      } else {
        setAuthenticated(false);
        if (isDev) resetDevPreview();
        else { setProducts([]); setCashTransactions([]); setBusinessId(null); }
      }
    } catch (error) {
      console.error("Falha ao carregar workspace V2", error);
    } finally {
      setWorkspaceReady(true);
    }
  };

  useEffect(() => {
    refreshWorkspace();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false);
        if (isDev) resetDevPreview();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const setPlanPreview=(next:Plan)=>{setPlan(next);setCredits(next==="premium"?7:1)};
  const handleRegistered=(product: WorkspaceProduct)=>{
    setProducts((current)=>[product as Product,...current.filter((item)=>item.id!==product.id)]);
    setScreen("produtos");
  };
  const handleSignOut=async()=>{
    await signOutV2();
    setAuthenticated(false);
    if(isDev)resetDevPreview();
  };
  const handlePriceUpdated=(productId:string, price:number)=>{
    setProducts((current)=>current.map((p)=>p.id===productId?{...p,price}:p));
  };
  const handleStockUpdated=(productId:string, stock:number)=>{
    setProducts((current)=>current.map((p)=>p.id===productId?{...p,stock}:p));
  };

  const content = useMemo(()=>{
    if(screen==="painel") return <DashboardScreen products={products} transactions={cashTransactions} onGoProducts={()=>setScreen("produtos")} onGoCmv={()=>setScreen("cmv")} onAssistant={()=>setAssistantOpen(true)}/>;
    if(screen==="produtos") return <ProductsScreen products={products} onAssistant={()=>setAssistantOpen(true)}/>;
    if(screen==="cmv") return <CmvScreen products={products}/>;
    if(screen==="estoque") return <StockScreen products={products} onNew={()=>setStockModalOpen(true)}/>;
    if(screen==="caixa") return <CashScreen transactions={cashTransactions} onNew={()=>setCashModalOpen(true)}/>;
    return <PricingScreen products={products} authenticated={authenticated} onPriceUpdated={handlePriceUpdated}/>;
  },[screen,products,cashTransactions,authenticated]);

  if(!workspaceReady) return <div className="v2-loading"><div className="brand-mark big"><Zap size={24}/></div><strong>PrecifiqueJá V2</strong><span>Preparando seu negócio...</span></div>;
  if((!isDev || showDevAuth) && !authenticated) return <AuthGateV2 onAuthenticated={refreshWorkspace}/>;

  return <div className="pj-shell">
    <Sidebar screen={screen} setScreen={setScreen} onAssistant={()=>setAssistantOpen(true)} plan={plan} credits={credits}/>
    <div className="app-main">
      <Topbar screen={screen} onAssistant={()=>setAssistantOpen(true)} onMobileMenu={()=>setMobileMenu(true)} businessName={businessName} onSignOut={handleSignOut} authenticated={authenticated}/>
      <main className="content-wrap">
        {isDev&&!authenticated&&<div className="preview-plan-switch"><span>Preview do acesso</span><button className={plan-==="basic"?"active":""} onClick={()=>setPlanPreview("basic")}>Básico · 1 crédito</button><button className={plan==="premium"?"active":""} onClick={()=>setPlanPreview("premium")}>Premium · 7 créditos</button><button onClick={()=>setShowDevAuth(true)}>Testar conta real</button></div>}
        {content}
      </main>
    </div>
    <nav className="mobile-bottom-nav">{NAV.slice(0,5).map(({key,label,icon:Icon})=><button className={screen===key?"active":""} key={key} onClick={()=>setScreen(key)}><Icon size={19}/><span>{label}</span></button>)}<button onClick={()=>setAssistantOpen(true)}><Sparkles size={19}/><span>Assistente</span></button></nav>
    {mobileMenu&&<div className="mobile-drawer-backdrop" onClick={()=>setMobileMenu(false)}><aside className="mobile-drawer" onClick={e=>e.stopPropagation()}><div className="mobile-drawer-head"><Logo/><button className="icon-button plain" onClick={()=>setMobileMenu(false)}><X size={20}/></button></div>{NAV.map({key,label,icon:Icon})=><button className={`nav-item ${screen===key?"active":""}`} key={key} onClick={()=>{setScreen(key);setMobileMenu(false)}}><Icon size={18}/><span>{label}</span></button>)}<button className="assistant-mini-card" onClick={()=>{setMobileMenu(false);setAssistantOpen(true)}}><div className="assistant-mini-top"><div className="assistant-orb"><WandSparkles size={17}/></div><div><span>Assistente V2</span><strong>{credits} cadastros disponíveis</strong></div></div></button></aside></div>}
    <AssistantModalV2 open={assistantOpen} onClose={()=>setAssistantOpen(false)} plan={plan} credits={credits} authenticated={authenticated} onCreditsChange={setCredits} onProductRegistered={handleRegistered}/>
    <CashEntryModal open={cashModalOpen} onClose={()=>setCashModalOpen(false)} authenticated={authenticated} businessId={businessId} products={products} onCreated={(tx)=>setCashTransactions((current)=>[tx,...current])}/>
    <StockMovementModal open={stockModalOpen} onClose={()=>setStockModalOpen(false)} authenticated={authenticated} products={products} onUpdated={handleStockUpdated}/>
  </div>;
}

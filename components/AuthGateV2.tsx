"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { signInV2, signUpV2 } from "../lib/workspace";

type Props = { onAuthenticated: () => Promise<void> | void };
type Mode = "login" | "signup";

export default function AuthGateV2({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setError(""); setNotice("");
    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Digite seu nome.");
        if (password.length < 6) throw new Error("Use uma senha com pelo menos 6 caracteres.");
        const data = await signUpV2(name, email, password);
        if (!data.session) {
          setNotice("Conta criada. Confira seu e-mail para confirmar o acesso e depois entre aqui.");
          setMode("login");
          return;
        }
      } else {
        await signInV2(email, password);
      }
      await onAuthenticated();
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Não foi possível entrar.";
      setError(raw === "Invalid login credentials" ? "E-mail ou senha incorretos." : raw);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-lockup"><div className="brand-mark big"><Zap size={24} strokeWidth={2.7}/></div><div><strong>PrecifiqueJá</strong><span>V2 · Novo Oficial</span></div></div>
        <div className="auth-message">
          <span className="eyebrow light">Decisão antes do improviso</span>
          <h1>Seu preço, margem, estoque e caixa <span>no mesmo sistema.</span></h1>
          <p>Uma nova geração do PrecifiqueJá construída para operar bem no celular e no computador.</p>
        </div>
        <div className="auth-benefits">
          <div><CheckCircle2 size={18}/><span><strong>Preço ideal explicado</strong><small>custo completo, margem e impacto</small></span></div>
          <div><CheckCircle2 size={18}/><span><strong>Produtos visuais</strong><small>fotos, saúde, CMV e oportunidade</small></span></div>
          <div><CheckCircle2 size={18}/><span><strong>Assistente com créditos</strong><small>Básico 1 · Premium 7 · pacotes extras</small></span></div>
        </div>
        <div className="auth-security"><ShieldCheck size={16}/><span>Ambiente V2 separado do PrecifiqueJá Legacy e de outros produtos.</span></div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-icon"><Sparkles size={22}/></div>
          <span className="eyebrow">Acesso ao PrecifiqueJá V2</span>
          <h2>{mode === "login" ? "Entre no seu negócio" : "Crie seu acesso"}</h2>
          <p>{mode === "login" ? "Use o e-mail liberado na sua compra." : "Seu plano e créditos serão vinculados ao mesmo e-mail usado na compra."}</p>
          <div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Entrar</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Criar conta</button></div>
          <form onSubmit={submit} className="auth-form">
            {mode === "signup" && <label>Seu nome<input value={name} onChange={(e)=>setName(e.target.value)} autoComplete="name" placeholder="Como podemos chamar você?" /></label>}
            <label>E-mail<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} autoComplete="email" placeholder="voce@seunegocio.com" /></label>
            <label>Senha<div className="password-field"><input type={showPassword ? "text" : "password"} required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••"/><button type="button" onClick={()=>setShowPassword((v)=>!v)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>
            {error && <div className="auth-alert error">{error}</div>}
            {notice && <div className="auth-alert success">{notice}</div>}
            <button className="primary-action auth-submit" disabled={loading}>{loading ? "Aguarde..." : mode === "login" ? "Entrar no PrecifiqueJá" : "Criar meu acesso"}<ArrowRight size={17}/></button>
          </form>
          <small className="auth-footnote">O plano exibido dentro do app é definido pelo acesso liberado para sua compra.</small>
        </div>
      </section>
    </main>
  );
}

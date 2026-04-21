import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, toast } from "@getbud-co/buds";
import {
  MicrosoftTeamsLogo,
  GoogleLogo,
  QrCode,
  EyeSlash,
  Eye,
} from "@phosphor-icons/react";
import { BudLogo } from "@/components/BudLogo";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const emailError = !email.trim()
    ? "Email é obrigatório"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Email inválido"
      : "";

  const passwordError = !password
    ? "Senha é obrigatória"
    : password.length < 6
      ? "Senha deve ter no mínimo 6 caracteres"
      : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (emailError || passwordError) return;

    setLoading(true);
    setApiError(null);
    try {
      await login(email.trim(), password);
      navigate("/home");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function handleSocialLogin() {
    toast.success("Login social em breve");
  }

  const PasswordIcon = showPassword ? Eye : EyeSlash;

  return (
    <div className={styles.page}>
      <div className={styles.body}>
        <BudLogo height={32} />

        <div className={styles.card}>
          {/* Header */}
          <h1 className={styles.title}>Acesse a sua conta</h1>

          {/* Social buttons */}
          <div className={styles.socialButtons}>
            <Button variant="secondary" size="lg" leftIcon={MicrosoftTeamsLogo} onClick={handleSocialLogin}>
              Microsoft
            </Button>
            <Button variant="secondary" size="lg" leftIcon={GoogleLogo} onClick={handleSocialLogin}>
              Google
            </Button>
            <Button variant="secondary" size="lg" leftIcon={QrCode} onClick={handleSocialLogin}>
              QR Code
            </Button>
          </div>

          {/* Divider */}
          <div className={styles.divider}>
            <span className={styles.dividerLine} />
            <span className={styles.dividerText}>OU</span>
            <span className={styles.dividerLine} />
          </div>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit}>
            <Input
              label="Email"
              size="lg"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setApiError(null); }}
              placeholder="seu@email.com"
              message={submitted && emailError ? emailError : undefined}
              messageType={submitted && emailError ? "error" : undefined}
            />

            <div className={styles.passwordField}>
              <Input
                label="Senha"
                size="lg"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setApiError(null); }}
                placeholder="••••••••••"
                message={submitted && passwordError ? passwordError : undefined}
                messageType={submitted && passwordError ? "error" : undefined}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                <PasswordIcon size={16} />
              </button>
            </div>

            {apiError && (
              <p className={styles.apiError}>{apiError}</p>
            )}

            <Button variant="primary" size="lg" type="submit" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <button type="button" className={styles.forgotLink} onClick={() => toast.success("Recuperação de senha em breve")}>
              Esqueceu sua senha?
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

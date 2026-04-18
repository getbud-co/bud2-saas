import { WifiSlash, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@getbud-co/buds";
import { BudLogo } from "./BudLogo";
import styles from "./ErrorScreen.module.css";

interface ErrorScreenProps {
  onRetry?: () => void;
  errorCode?: string;
}

export function ErrorScreen({ onRetry, errorCode }: ErrorScreenProps) {
  return (
    <div className={styles.screen} role="alert">
      <div className={styles.card}>
        <div className={styles.cardContent}>
          <div className={styles.iconWrapper}>
            <WifiSlash size={32} />
          </div>

          <div className={styles.textGroup}>
            <h1 className={styles.title}>Não foi possível conectar ao servidor</h1>
            <p className={styles.description}>
              Estamos com dificuldade para carregar seus dados. Isso pode acontecer
              por uma instabilidade temporária na conexão ou no nosso servidor.
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              variant="primary"
              size="md"
              leftIcon={ArrowClockwise}
              onClick={onRetry ?? (() => window.location.reload())}
            >
              Tentar novamente
            </Button>
          </div>

          <p className={styles.details}>
            Se o problema persistir, verifique sua conexão com a internet
            ou tente novamente em alguns minutos.
            {errorCode && (
              <span className={styles.detailsCode}>{errorCode}</span>
            )}
          </p>
        </div>

        <BudLogo height={20} color="var(--color-caramel-300)" />
      </div>
    </div>
  );
}

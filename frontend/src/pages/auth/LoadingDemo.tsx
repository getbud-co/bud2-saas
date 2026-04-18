import { useState } from "react";
import { Button, LoadingScreen } from "@getbud-co/buds";
import { ErrorScreen } from "@/components/ErrorScreen";

type DemoState = "loading" | "error" | "menu";

export function LoadingDemo() {
  const [state, setState] = useState<DemoState>("menu");

  if (state === "loading") {
    // Simula loading por 4s e depois volta ao menu
    setTimeout(() => setState("menu"), 4000);
    return <LoadingScreen />;
  }

  if (state === "error") {
    return (
      <ErrorScreen
        onRetry={() => setState("menu")}
        errorCode="ERR_CONNECTION_REFUSED"
      />
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100dvh",
      gap: "var(--sp-md)",
    }}>
      <h1 style={{
        fontFamily: "var(--font-heading)",
        fontSize: "var(--text-lg)",
        color: "var(--color-neutral-950)",
      }}>
        Demo: Loading e Error Screens
      </h1>
      <div style={{ display: "flex", gap: "var(--sp-xs)" }}>
        <Button variant="primary" size="md" onClick={() => setState("loading")}>
          Ver Loading
        </Button>
        <Button variant="secondary" size="md" onClick={() => setState("error")}>
          Ver Erro
        </Button>
      </div>
    </div>
  );
}

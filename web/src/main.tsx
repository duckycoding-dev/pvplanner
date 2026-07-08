import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { LangProvider } from "./i18n/useT.tsx";
import { ThemeProvider } from "./theme/useTheme.tsx";
import "./styles.css";

const el = document.getElementById("root");
if (el !== null) {
  createRoot(el).render(
    <LangProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </LangProvider>,
  );
}

import { useEffect, useState } from "react";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export default function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const onInstallAvailable = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") setInstalled(true);
    } catch {
      setShowInstructions(true);
    }
  };

  return (
    <span className="pwa-install-shell">
      <button
        className="pwa-install-button"
        type="button"
        onClick={install}
        aria-expanded={showInstructions}
        aria-controls="pwa-install-instructions"
      >
        <span aria-hidden="true">↓</span> Instalar Ka’illisto
      </button>
      {showInstructions && (
        <span className="pwa-install-help" id="pwa-install-instructions" role="status">
          <strong>Instálala en tu Android</strong>
          <span>En Chrome, abre el menú ⋮ y pulsa “Instalar aplicación” o “Añadir a pantalla principal”.</span>
          <button type="button" onClick={() => setShowInstructions(false)}>
            Entendido
          </button>
        </span>
      )}
    </span>
  );
}

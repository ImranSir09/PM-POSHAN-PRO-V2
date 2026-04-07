import React from "react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";

const InstallFAB: React.FC = () => {
  const { install, isInstallable } = useInstallPrompt();

  if (!isInstallable) return null;

  return (
    <button
      onClick={install}
      className="fixed bottom-24 right-4 z-50 px-4 py-3 rounded-full shadow-lg bg-sky-600 text-white text-sm font-semibold active:scale-95"
    >
      Install App
    </button>
  );
};

export default InstallFAB;

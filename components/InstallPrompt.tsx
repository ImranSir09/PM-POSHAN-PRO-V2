import { useEffect, useState } from "react";

export default function AutoInstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setPrompt(e);

      // show popup after slight delay
      setTimeout(() => setVisible(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
    }
  };

  if (!visible || !prompt) return null;

  return (
    <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 shadow-xl rounded-xl px-4 py-3 flex items-center gap-3 z-50 border border-gray-200">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
        Install PM Poshan Pro
      </span>

      <button
        onClick={install}
        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm"
      >
        Install
      </button>

      <button
        onClick={() => setVisible(false)}
        className="text-gray-500 text-sm"
      >
        ✕
      </button>
    </div>
  );
}

import { useEffect,useRef } from "react";
type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      language: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export default function Turnstile({
  siteKey,
  onToken,
  language = "auto",
}: {
  siteKey: string;
  onToken: (token: string) => void;
  language?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let widget: string | undefined;
    let cancelled = false;
    const render = () => {
      if (!cancelled && ref.current && window.turnstile)
        widget = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          action: "register",
          language: language === "zh" ? "zh-CN" : language,
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
    };
    if (window.turnstile) render();
    else {
      let script = document.querySelector<HTMLScriptElement>("#tba-turnstile");
      if (!script) {
        script = document.createElement("script");
        script.id = "tba-turnstile";
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        document.head.append(script);
      }
      script.addEventListener("load", render, { once: true });
    }
    return () => {
      cancelled = true;
      if (widget) window.turnstile?.remove(widget);
      onToken("");
    };
  }, [siteKey, onToken, language]);
  return <div className="captcha-container" ref={ref} />;
}

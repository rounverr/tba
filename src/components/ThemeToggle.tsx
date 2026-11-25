import { Moon,Sun } from "lucide-react";
import { useEffect,useState } from "react";
export default function ThemeToggle({
  labels,
}: { labels?: { light: string; dark: string } } = {}) {
  const [dark, setDark] = useState(false);
  useEffect(
    () => setDark(document.documentElement.classList.contains("dark")),
    [],
  );
  return (
    <button
      className="icon-button theme-toggle"
      aria-label={
        dark
          ? labels?.light || "Switch to light theme"
          : labels?.dark || "Switch to dark theme"
      }
      onClick={() => {
        document.documentElement.classList.toggle("dark");
        setDark(!dark);
        try {
          localStorage.setItem("tba-theme", !dark ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

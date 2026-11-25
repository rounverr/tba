import { useEffect, type RefObject } from "react";
export function usePanelHistory(
  navigationState: RefObject<{ view: string; busy: boolean }>,
  navigate: (view: string) => void,
  titles: Record<string, string>,
) {
  useEffect(() => {
    const back = () => {
      const next = location.pathname.replace(/^\/admin/, "").replace(/\/$/, "");
      if (navigationState.current.busy) {
        history.pushState(null, "", `/admin${navigationState.current.view}/`);
        return;
      }
      if (next === navigationState.current.view) return;
      if (Object.hasOwn(titles, next)) navigate(next);
      else location.reload();
    };
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
}

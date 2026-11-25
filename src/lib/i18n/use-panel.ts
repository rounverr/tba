import { useContext } from "react";
import { I18nContext } from "./context";
import {
  panelText,
  panelErrorText,
  type PanelMessage,
  type PanelValues,
} from "./panel";
import { translate } from "./catalog";
import { defaultLanguage } from "./config";
export function usePanelI18n() {
  const context = useContext(I18nContext);
  const language = context?.language || defaultLanguage;
  return {
    language,
    p: (message: PanelMessage, values?: PanelValues) =>
      panelText(language, message, values),
    errorText: (text: string) => panelErrorText(language, text),
    t:
      context?.t ||
      ((
        ...args: Parameters<typeof translate> extends [unknown, ...infer Rest]
          ? Rest
          : never
      ) => translate(defaultLanguage, ...args)),
  };
}

import legacyLabels from "../../lib/i18n/legacy-labels.json";
import {
  Children,
  useContext,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type SelectHTMLAttributes,
  type OptionHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { I18nContext } from "../../lib/i18n/context";
import { Check, ChevronDown } from "lucide-react";

// Keep native form serialization and validation, with a predictable popover menu.
export default function Select({
  children,
  value,
  defaultValue,
  onChange,
  className = "",
  triggerContent,
  popupHeading,
  popupWidth,
  popupMaxHeight = 260,
  onAction,
  onOptionIntent,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  triggerContent?: ReactNode;
  popupHeading?: ReactNode;
  popupWidth?: number;
  popupMaxHeight?: number;
  onAction?: (value: string) => void;
  onOptionIntent?: (value: string) => void;
}) {
  const i18n = useContext(I18nContext);
  const options = Children.toArray(children)
    .filter(
      isValidElement<
        OptionHTMLAttributes<HTMLOptionElement> & { "data-action"?: boolean }
      >,
    )
    .map((child) => ({
      value: String(child.props.value ?? ""),
      label: child.props.children,
      disabled: !!child.props.disabled,
      lang: child.props.lang,
      dir: child.props.dir,
      action: !!child.props["data-action"],
    }));
  const [internal, setInternal] = useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const selected = String(value ?? internal);
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({});
  const native = useRef<HTMLSelectElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  const label = options.find((option) => option.value === selected)?.label;
  function close(restore = true) {
    popup.current?.hidePopover?.();
    setOpen(false);
    if (restore) trigger.current?.focus();
  }
  function focusOption(index: number) {
    const buttons = popup.current?.querySelectorAll<HTMLButtonElement>(
      "[role=option]:not(:disabled)",
    );
    if (!buttons?.length) return;
    buttons[(index + buttons.length) % buttons.length].focus();
  }
  function show() {
    if (props.disabled) return;
    const rect = trigger.current!.getBoundingClientRect();
    const below = innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const upwards =
      below < Math.min(popupMaxHeight, options.length * 48 + 20) &&
      above > below;
    const height = Math.max(
      60,
      Math.min(popupMaxHeight, upwards ? above : below),
    );
    const width = Math.min(popupWidth ?? rect.width, innerWidth - 16);
    const rtl = getComputedStyle(trigger.current!).direction === "rtl";
    const left = rtl ? rect.left : rect.right - width;
    setPosition({
      left: Math.max(8, Math.min(left, innerWidth - width - 8)),
      width,
      maxHeight: height,
      top: upwards ? undefined : rect.bottom + 6,
      bottom: upwards ? innerHeight - rect.top + 6 : undefined,
    });
    setOpen(true);
    popup.current?.showPopover?.();
  }
  useLayoutEffect(() => {
    if (!open) return;
    const index = options
      .filter((option) => !option.disabled)
      .findIndex((option) => option.value === selected);
    focusOption(Math.max(0, index));
  }, [open]);
  function choose(next: string) {
    if (options.find((option) => option.value === next)?.action) {
      close();
      onAction?.(next);
      return;
    }
    if (!native.current) return;
    native.current.value = next;
    native.current.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  }
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !popup.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        close(false);
    };
    const dismiss = () => close(false);
    const scroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);
  return (
    <span className={`select-control ${className}`}>
      <select
        {...props}
        ref={native}
        id={undefined}
        value={selected}
        tabIndex={-1}
        aria-hidden="true"
        className="select-native"
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          show();
        }}
        onChange={(event) => {
          setInternal(event.target.value);
          setInvalid(false);
          onChange?.(event);
        }}
      >
        {Children.toArray(children).filter(
          (child) =>
            !isValidElement<{ "data-action"?: boolean }>(child) ||
            !child.props["data-action"],
        )}
      </select>
      <button
        ref={trigger}
        id={props.id}
        type="button"
        role="combobox"
        aria-label={props["aria-label"]}
        title={props.title}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-haspopup="listbox"
        aria-required={props.required}
        aria-invalid={invalid || undefined}
        disabled={props.disabled}
        className="select-trigger"
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            show();
          }
        }}
      >
        <span>{triggerContent ?? label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <div
        ref={popup}
        id={`${id}-options`}
        role="listbox"
        aria-label={
          props["aria-label"] ||
          i18n?.t("selectOptions") ||
          legacyLabels.options
        }
        popover="manual"
        className={`select-popup ${open ? "is-open" : ""}`}
        style={position}
        onKeyDown={(event) => {
          const buttons = Array.from(
            popup.current!.querySelectorAll<HTMLButtonElement>(
              "[role=option]:not(:disabled)",
            ),
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            focusOption(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : index + (event.key === "ArrowDown" ? 1 : -1),
            );
          } else if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
          } else if (event.key === "Tab") close();
          else if (event.key.length === 1 && /\S/.test(event.key)) {
            const match = buttons.find((button) =>
              button.textContent
                ?.trim()
                .toLocaleLowerCase()
                .startsWith(event.key.toLocaleLowerCase()),
            );
            match?.focus();
          }
        }}
      >
        {popupHeading && (
          <div className="select-popup-heading" aria-hidden="true">
            {popupHeading}
          </div>
        )}
        {options.map((option) => (
          <button
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={selected === option.value}
            aria-label={
              triggerContent && typeof option.label === "string"
                ? option.label
                : undefined
            }
            lang={option.lang}
            data-value={option.value}
            className={option.action ? "select-action" : undefined}
            key={option.value}
            disabled={option.disabled}
            onPointerEnter={() => onOptionIntent?.(option.value)}
            onFocus={() => onOptionIntent?.(option.value)}
            onClick={() => choose(option.value)}
          >
            <span dir={option.dir}>{option.label}</span>
            {selected === option.value && (
              <Check size={14} aria-hidden="true" />
            )}
          </button>
        ))}
      </div>
      {invalid && (
        <span className="select-error">
          {i18n?.t("selectRequired") || legacyLabels.selectAnOption}
        </span>
      )}
    </span>
  );
}

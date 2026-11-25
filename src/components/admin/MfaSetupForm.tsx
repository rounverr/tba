import { ArrowRight, Check, ChevronDown, Copy, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeOtpDigits } from "../../lib/i18n/errors";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { manualMfaKey } from "../../lib/presentation";
import { Button } from "../ui/button";
export default function MfaSetupForm({
  enroll,
  qr,
  busy,
  onSubmit,
  setError,
}: {
  enroll: { totpURI: string };
  qr: string;
  busy: boolean;
  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { p } = usePanelI18n();
  const [keyCopied, setKeyCopied] = useState(false);
  const [manualKeyVisible, setManualKeyVisible] = useState(false);
  useEffect(() => {
    setKeyCopied(false);
    setManualKeyVisible(false);
  }, [enroll.totpURI]);
  return (
    <form className="mfa-setup-form" onSubmit={onSubmit}>
      <p id="mfa-setup-description" className="mfa-setup-description">
        {p("scanTheQrCodeWithYourApp")}
      </p>
      <div className="mfa-qr-frame">
        <img
          className="qr-image"
          src={qr}
          alt={p("qrCodeForSettingUpYourAuthenticator")}
        />
      </div>
      <div className="manual-mfa">
        <button
          type="button"
          className="manual-mfa-toggle"
          aria-expanded={manualKeyVisible}
          aria-controls="manual-mfa-key"
          onClick={() => {
            setManualKeyVisible((visible) => !visible);
            setKeyCopied(false);
          }}
        >
          <KeyRound size={15} aria-hidden="true" />
          <span>{p("manualSetup")}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        <div id="manual-mfa-key" hidden={!manualKeyVisible}>
          {manualKeyVisible && (
            <>
              <p>{p("preferManualSetupSelectTheKeyTo")}</p>
              <button
                type="button"
                className={`manual-key ${keyCopied ? "is-copied" : ""}`}
                aria-label={p(
                  keyCopied ? "keyCopiedPasteItOnlyIntoYour" : "copySetupKey",
                )}
                title={p(
                  keyCopied ? "keyCopiedPasteItOnlyIntoYour" : "copySetupKey",
                )}
                onClick={async () => {
                  setKeyCopied(false);
                  try {
                    await navigator.clipboard.writeText(
                      manualMfaKey(enroll.totpURI),
                    );
                    setKeyCopied(true);
                    setError((value) =>
                      value === "copyFailedSelectTheKeyAndCopy" ? "" : value,
                    );
                  } catch {
                    setError("copyFailedSelectTheKeyAndCopy");
                  }
                }}
              >
                <code dir="ltr">{manualMfaKey(enroll.totpURI)}</code>
                {keyCopied ? (
                  <Check size={17} aria-hidden="true" />
                ) : (
                  <Copy size={15} aria-hidden="true" />
                )}
              </button>
              <span className="sr-only" role="status">
                {keyCopied ? p("keyCopiedPasteItOnlyIntoYour") : ""}
              </span>
            </>
          )}
        </div>
      </div>
      <label className="field-label mfa-code-field">
        {p("authenticatorCode")}
        <input
          className="code-input mfa-activation-code"
          dir="ltr"
          name="code"
          aria-describedby="mfa-setup-description"
          onInput={(event) => {
            event.currentTarget.value = normalizeOtpDigits(
              event.currentTarget.value,
            );
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="[0-9]{6}"
          maxLength={6}
        />
      </label>
      <Button type="submit" disabled={busy}>
        {p("verifyAndEnable")}
        <ArrowRight size={16} className="directional-icon" />
      </Button>
    </form>
  );
}

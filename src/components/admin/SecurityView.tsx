import {
  ArrowRight,
  Copy,
  Download,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import app from "../../config/app.json";
import { downloadRecoveryCodes } from "../../lib/download";
import { type PanelMessage } from "../../lib/i18n/panel";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { Button } from "../ui/button";
import type { Profile } from "./types";
export default function SecurityView({
  profile,
  busy,
  codes,
  setCodes,
  setModal,
  startMfa,
  setNotice,
  setError,
}: {
  profile: Profile;
  busy: boolean;
  codes: string[];
  setCodes: React.Dispatch<React.SetStateAction<string[]>>;
  setModal: (modal: "backup" | "disable" | "revoke") => void;
  startMfa: () => Promise<void>;
  setNotice: React.Dispatch<React.SetStateAction<PanelMessage>>;
  setError: React.Dispatch<React.SetStateAction<string>>;
}) {
  const { p, language } = usePanelI18n();
  return (
    <div className="security-panels">
      <section className="panel settings-panel">
        <span className="role-icon">
          <ShieldCheck size={23} />
        </span>
        <h2>{p("oneExtraStepGreaterPeaceOfMind")}</h2>
        <p>{p("protectYourAccountWithAnAppLike")}</p>
        <div className="setting-row">
          <div>
            <strong>{p("twoStepVerification")}</strong>
            <p>
              {profile.mfaEnabled
                ? p("yourSecondFactorIsActive114")
                : p("addAnAppGeneratedCodeWhenYou")}
            </p>
          </div>
          <span
            className={`status-badge ${profile.mfaEnabled ? "active" : "pending"}`}
          >
            {profile.mfaEnabled ? p("enabled") : p("notEnabled")}
          </span>
        </div>
        {profile.mfaEnabled ? (
          <div className="button-row">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setError("");
                setNotice("");
                setModal("backup");
              }}
            >
              <KeyRound size={15} />
              {p("regenerateRecoveryCodes")}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setError("");
                setNotice("");
                setModal("disable");
              }}
            >
              {p("disableMfa")}
            </Button>
          </div>
        ) : (
          <Button disabled={busy || !profile.mfaAvailable} onClick={startMfa}>
            {p("enableTwoStepVerification120")}
            <ArrowRight className="directional-icon" size={16} />
          </Button>
        )}
        {!profile.mfaAvailable && !profile.mfaEnabled && (
          <p>{p("mfaEnrollmentIsDisabledForThisApplication")}</p>
        )}
      </section>
      <section className="panel settings-panel">
        <h2>{p("trustedDevices")}</h2>
        <p>{p("aTrustedDeviceCanSkipTheSecond")}</p>
        <Button
          variant="outline"
          disabled={busy || !profile.mfaEnabled}
          onClick={() => {
            setError("");
            setNotice("");
            setModal("revoke");
          }}
        >
          <RefreshCw size={15} />
          {p("revokeTrustedDevices")}
        </Button>
      </section>
      {codes.length > 0 && (
        <section className="panel recovery-codes">
          <h2>{p("saveTheseRecoveryCodes")}</h2>
          <p>{p("theseAreShownOnlyNowEachCode")}</p>
          <div className="recovery-code-grid">
            {codes.map((c) => (
              <code key={c} dir="ltr">
                {c}
              </code>
            ))}
          </div>
          <div className="recovery-actions">
            <Button
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(codes.join("\n"))
                  .then(() => setNotice("codesCopiedKeepThemSomewhereSafe"))
                  .catch(() => setError("copyFailedSaveTheCodesManually"))
              }
            >
              <Copy size={15} />
              {p("copyCodes")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                downloadRecoveryCodes(app.name, codes, language);
                setNotice("downloadStartedKeepTheFileSomewherePrivate");
              }}
            >
              <Download size={15} /> {p("downloadTxt")}
            </Button>
            <Button variant="ghost" onClick={() => setCodes([])}>
              {p("iHaveSavedThem")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

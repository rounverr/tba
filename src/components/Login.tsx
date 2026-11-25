import {
ArrowLeft,
ArrowRight,
Check,
ExternalLink,
KeyRound,
LifeBuoy,
LoaderCircle,
LockKeyhole,
Mail,
ShieldCheck,
X,
} from "lucide-react";
import { useEffect,useRef,useState,type SubmitEvent } from "react";
import app from "../config/app.json";
import type { MessageKey } from "../lib/i18n/catalog";
import { authErrorKey,normalizeOtpDigits } from "../lib/i18n/errors";
import { api } from "../lib/utils";
import { AuthI18n,LanguageSelector,useAuthI18n } from "./AuthI18n";
import Brand from "./Brand";
import Modal from "./Modal";
import ThemeToggle from "./ThemeToggle";
import Turnstile from "./Turnstile";
import { Button } from "./ui/button";

type Meta = {
  mode: "closed" | "approval" | "open";
  google: boolean;
  mfa: boolean;
  trustDevice: boolean;
  turnstileSiteKey?: string;
};
type Stage = "email" | "otp" | "mfa" | "recovery" | "pending";
export default function Login() {
  return (
    <AuthI18n>
      <LoginForm />
    </AuthI18n>
  );
}
function LoginForm() {
  const { t, language } = useAuthI18n();
  function request<T = Record<string, unknown>>(path: string, body?: unknown) {
    return api<T>(path, body, undefined, language);
  }
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReset, setCaptchaReset] = useState(0);
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [register, setRegister] = useState(false);
  const [trust, setTrust] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState<MessageKey | null>(null);
  const reauth =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).has("reauth");
  const profileReauth =
    typeof location !== "undefined" &&
    new URLSearchParams(location.search).get("reauth") === "profile";
  const destination = reauth
    ? profileReauth
      ? "/admin/profile/"
      : "/admin/security/"
    : "/admin/";
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    request<Meta>("/public/config")
      .then(setMeta)
      .catch(() => setError("errorUnavailable"));
    if (reauth) {
      setNotice(profileReauth ? "reauthProfile" : "reauthSecurity");
      request<{ user: { email: string } }>("/session")
        .then((s) => setEmail((value) => value || s.user.email))
        .catch(() => {});
    }
    if (new URLSearchParams(location.search).has("mfa"))
      request<{ user: { email: string }; mfaRequired: boolean }>("/session")
        .then((s) => {
          if (s.mfaRequired) {
            setEmail(s.user.email);
            setStage("mfa");
          } else location.assign(destination);
        })
        .catch(() => setError("errorVerifyAgain"));
    if (new URLSearchParams(location.search).has("error"))
      setError("errorDenied");
  }, []);
  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);
  useEffect(() => {
    input.current?.focus();
  }, [stage]);
  async function send() {
    if (stage === "email") setTrust(false);
    setBusy(true);
    setError(null);
    try {
      await request("/access/send", {
        email,
        intent: register ? "register" : "login",
        captchaToken,
      });
      setStage("otp");
      setCode("");
      setCooldown(60);
      setCaptchaReset((v) => v + 1);
      setNotice(null);
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError(null);
    const invalid: MessageKey | null =
      stage === "email"
        ? !email
          ? "emailRequired"
          : input.current?.validity.typeMismatch
            ? "emailInvalid"
            : null
        : !code
          ? stage === "recovery"
            ? "recoveryRequired"
            : "codeRequired"
          : stage !== "recovery" && code.length !== 6
            ? "codeInvalid"
            : stage === "recovery" && (code.length < 6 || code.length > 32)
              ? "recoveryInvalid"
              : null;
    if (invalid) {
      setError(invalid);
      input.current?.focus();
      return;
    }
    if (stage === "email") {
      await send();
      return;
    }
    setBusy(true);
    try {
      if (stage === "otp") {
        const r = await request<{ pending?: boolean }>("/access/verify", {
          email,
          code,
          intent: register ? "register" : "login",
        });
        if (r.pending) {
          setStage("pending");
          return;
        }
        const session = await request<{ mfaRequired: boolean }>("/session");
        if (session.mfaRequired) {
          setStage("mfa");
          setCode("");
        } else location.assign(destination);
      } else {
        await request("/security/challenge", {
          code,
          method: stage === "recovery" ? "recovery" : "totp",
          trustDevice: trust,
        });
        location.assign(destination);
      }
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<Stage, MessageKey> = {
    email: register ? "signUpTitle" : "signInTitle",
    otp: "otpTitle",
    mfa: "mfaTitle",
    recovery: "recoveryTitle",
    pending: "pendingTitle",
  };
  const descriptions: Record<Stage, MessageKey> = {
    email: register ? "signUpDescription" : "signInDescription",
    otp: "otpDescription",
    mfa: "mfaDescription",
    recovery: "recoveryDescription",
    pending: "pendingDescription",
  };
  return (
    <main className="auth-shell" data-auth-root>
      <section className="auth-left">
        <header className="auth-header">
          <Brand
            showOrganization={false}
            homeLabel={t("brandHome", { app: app.name })}
            organizationLabel={t("brandBy", { organization: app.organization })}
          />
          <div className="header-actions">
            <LanguageSelector />
            <ThemeToggle
              labels={{ light: t("themeLight"), dark: t("themeDark") }}
            />
          </div>
        </header>
        <div className="auth-body">
          <div className="auth-form-wrap">
            {stage !== "email" && (
              <button
                className="back-link"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setError(null);
                }}
              >
                <ArrowLeft size={15} className="directional-icon" /> {t("back")}
              </button>
            )}
            {stage !== "email" && (
              <div className="eyebrow">
                <span />{" "}
                {stage === "pending" ? t("contactEyebrow") : t("verifyEyebrow")}
              </div>
            )}
            <h1>{t(titles[stage])}</h1>
            <p className="auth-description">{t(descriptions[stage])}</p>
            {stage === "pending" ? (
              <div className="pending-card">
                <span className="success-circle">
                  <Check size={24} />
                </span>
                <strong>
                  <bdi dir="ltr">{email}</bdi>
                </strong>
                <p>{t("pendingNotice")}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStage("email");
                    setRegister(false);
                  }}
                >
                  {t("backSignIn")}{" "}
                  <ArrowRight size={17} className="directional-icon" />
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="auth-form" noValidate>
                {stage === "email" ? (
                  <>
                    <label className="field-label" htmlFor="email">
                      {t("emailLabel")}
                    </label>
                    <div className="input-wrap">
                      <Mail size={19} />
                      <input
                        ref={input}
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder={t("emailPlaceholder")}
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        maxLength={254}
                        disabled={busy}
                      />
                    </div>
                    <div className="input-hint">
                      <LockKeyhole size={13} />
                      <span>{t("passwordlessHint")}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="recipient">
                      <span className="recipient-icon">
                        {stage === "otp" ? (
                          <Mail size={19} />
                        ) : (
                          <ShieldCheck size={19} />
                        )}
                      </span>
                      <span>
                        <bdi dir="ltr">{email}</bdi>
                        <button
                          type="button"
                          onClick={() => {
                            setStage("email");
                            setCode("");
                            setError(null);
                          }}
                        >
                          {t("changeEmail")}
                        </button>
                      </span>
                    </div>
                    <label className="field-label" htmlFor="code">
                      {stage === "recovery"
                        ? t("recoveryLabel")
                        : stage === "mfa"
                          ? t("authenticatorLabel")
                          : t("otpLabel")}
                    </label>
                    <input
                      ref={input}
                      id="code"
                      dir="ltr"
                      className={
                        stage === "recovery" ? "text-input" : "code-input"
                      }
                      inputMode={stage === "recovery" ? "text" : "numeric"}
                      autoComplete="one-time-code"
                      placeholder={
                        stage === "recovery"
                          ? t("recoveryPlaceholder")
                          : t("otpPlaceholder")
                      }
                      value={code}
                      onChange={(e) =>
                        setCode(
                          stage === "recovery"
                            ? e.target.value
                            : normalizeOtpDigits(e.target.value),
                        )
                      }
                      pattern={stage === "recovery" ? undefined : "[0-9]{6}"}
                      maxLength={stage === "recovery" ? 32 : 6}
                      required
                      disabled={busy}
                    />
                    {["otp", "mfa", "recovery"].includes(stage) &&
                      meta?.mfa &&
                      meta?.trustDevice && (
                        <label className="check-label">
                          <input
                            type="checkbox"
                            checked={trust}
                            onChange={(e) => setTrust(e.target.checked)}
                          />
                          <span>
                            {t("trustLabel")}
                            <small>{t("trustHint")}</small>
                          </span>
                        </label>
                      )}
                  </>
                )}
                {error && (
                  <div className="form-error" role="alert">
                    {t(error)}
                  </div>
                )}
                {notice && (
                  <div className="form-notice" role="status">
                    {t(notice)}
                  </div>
                )}
                {(stage === "email" || stage === "otp") &&
                  register &&
                  meta?.turnstileSiteKey && (
                    <Turnstile
                      key={captchaReset}
                      siteKey={meta.turnstileSiteKey}
                      language={language}
                      onToken={setCaptchaToken}
                    />
                  )}
                <Button
                  className="submit-button"
                  disabled={busy || !meta}
                  type="submit"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={18} className="spin" /> {t("loading")}
                    </>
                  ) : (
                    <>
                      {stage === "email"
                        ? t("continueEmail")
                        : stage === "otp"
                          ? t("verifyContinue")
                          : t("verifyContinue")}
                      <ArrowRight size={18} className="directional-icon" />
                    </>
                  )}
                </Button>
                {stage === "otp" && (
                  <div className="resend-line">
                    {t("resendPrompt")}{" "}
                    <button
                      type="button"
                      disabled={cooldown > 0 || busy}
                      onClick={send}
                    >
                      {cooldown > 0
                        ? t("resendCountdown", {
                            seconds: new Intl.NumberFormat(language).format(
                              cooldown,
                            ),
                          })
                        : t("resend")}
                    </button>
                    <p>{t("resendHint")}</p>
                  </div>
                )}
                {(stage === "mfa" || stage === "recovery") && (
                  <button
                    type="button"
                    className="text-link recovery-link"
                    onClick={() => {
                      setStage(stage === "mfa" ? "recovery" : "mfa");
                      setCode("");
                      setError(null);
                    }}
                  >
                    <KeyRound size={15} />
                    {stage === "mfa" ? t("useRecovery") : t("useAuthenticator")}
                  </button>
                )}
                {stage === "email" && meta?.google && (
                  <>
                    <div className="divider">
                      <span />
                      {t("orContinue")}
                      <span />
                    </div>
                    <Button
                      variant="outline"
                      type="button"
                      className="google-button"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const r = await request<{ url: string }>(
                            "/auth/sign-in/social",
                            {
                              provider: "google",
                              callbackURL: "/login/complete",
                            },
                          );
                          location.assign(r.url);
                        } catch (e) {
                          setError(authErrorKey(e));
                          setBusy(false);
                        }
                      }}
                    >
                      <img src="/google.svg" alt="" width="19" height="19" />
                      {t("google")}
                    </Button>
                  </>
                )}
              </form>
            )}
            {stage === "email" && (
              <div className="access-note">
                {meta && meta.mode !== "closed" ? (
                  <>
                    {register ? t("haveAccess") : t("firstVisit")}{" "}
                    <button
                      onClick={() => {
                        setRegister(!register);
                        setError(null);
                      }}
                    >
                      {register
                        ? t("signIn")
                        : meta.mode === "approval"
                          ? t("requestAccess")
                          : t("createAccount")}
                      <ArrowRight size={13} className="directional-icon" />
                    </button>
                  </>
                ) : (
                  <>
                    {t("needAccess")}{" "}
                    <button onClick={() => setHelp(true)}>
                      {t("contactAdmin")}{" "}
                      <ExternalLink size={12} className="directional-icon" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <footer className="auth-footer">
          <span>
            © {new Date().getFullYear()} {app.organization}
          </span>
          <button onClick={() => setHelp(true)}>
            <LifeBuoy size={14} />
            {t("helpLink")}
          </button>
        </footer>
      </section>
      <aside className="auth-art">
        <picture className="auth-art-picture">
          <source
            media="(max-width: 740px)"
            srcSet="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          />
          <img
            src={app.heroImage}
            alt=""
            className="marble-image"
            fetchPriority="high"
          />
        </picture>
        <div className="art-top">
          <span className="art-pill">
            <span /> {t("connected")}
          </span>
        </div>
        <div className="art-copy">
          <h2>
            {t("artTitle1")}
            <br />
            {t("artTitle2")}
            <br />
            <span>{t("artTitle3")}</span>
          </h2>
          <p>{t("artDescription")}</p>
          <div className="art-bottom">
            <span className="art-pagination">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </aside>
      {help && (
        <Modal onClose={() => setHelp(false)} labelledBy="help-title">
          <section
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setHelp(false);
            }}
          >
            <button
              className="modal-close icon-button"
              autoFocus
              aria-label={t("helpClose")}
              onClick={() => setHelp(false)}
            >
              <X size={20} />
            </button>
            <LifeBuoy size={30} className="primary-text" />
            <h2 id="help-title">{t("helpTitle")}</h2>
            <p>{t("helpDescription")}</p>
            {app.supportEmail && (
              <a
                className="button button-primary"
                href={`mailto:${app.supportEmail}`}
              >
                {t("contactAdminButton")}
                <ArrowRight size={16} className="directional-icon" />
              </a>
            )}
            <Button variant="outline" onClick={() => setHelp(false)}>
              {t("understood")}
            </Button>
          </section>
        </Modal>
      )}
    </main>
  );
}

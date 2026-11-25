import { Check, X } from "lucide-react";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import Modal from "../Modal";
export default function EmailChangeComplete({
  onClose,
}: {
  onClose: () => void;
}) {
  const { p } = usePanelI18n();
  return (
    <Modal onClose={onClose} labelledBy="email-change-complete-title">
      <section data-app-root className="modal admin-modal email-change-modal">
        <button
          className="modal-close icon-button"
          aria-label={p("close")}
          onClick={onClose}
        >
          <X size={19} />
        </button>
        <h2 id="email-change-complete-title">{p("changeYourEmail")}</h2>
        <div className="email-change-complete">
          <div className="email-step-icon">
            <Check size={24} />
          </div>
          <p className="email-intro">{p("yourEmailWasUpdatedSuccessfully")}</p>
          <p>{p("signInWithYourNewAddressTo")}</p>
          <p className="email-hint">{p("yourRoleAndSecondFactorWereKept")}</p>
          <a className="button button-primary" href="/login/">
            {p("signInWithMyNewEmail")}
          </a>
        </div>
      </section>
    </Modal>
  );
}

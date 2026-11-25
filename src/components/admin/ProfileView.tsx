import { Check } from "lucide-react";
import { usePanelI18n } from "../../lib/i18n/use-panel";
import { Button } from "../ui/button";
import type { Profile } from "./types";
export default function ProfileView({
  profile,
  busy,
  onSubmit,
  onChangeEmail,
}: {
  profile: Profile;
  busy: boolean;
  onSubmit: React.SubmitEventHandler<HTMLFormElement>;
  onChangeEmail: () => void;
}) {
  const { p } = usePanelI18n();
  return (
    <form className="panel settings-panel" onSubmit={onSubmit}>
      <span className="profile-avatar">{profile.name.slice(0, 1)}</span>
      <h2>{p("personalInformation")}</h2>
      <label className="field-label" htmlFor="name">
        {p("name")}
      </label>
      <input
        className="text-input"
        name="name"
        id="name"
        defaultValue={profile.name}
        required
        maxLength={80}
      />
      <label className="field-label spaced-label" htmlFor="profileEmail">
        {p("verifiedEmailAddress")}
      </label>
      <input
        className="text-input"
        id="profileEmail"
        value={profile.email}
        disabled
      />
      <p>{p("yourEmailIsYourSignInIdentity")}</p>
      <div className="profile-actions">
        <Button type="button" variant="outline" onClick={onChangeEmail}>
          {p("changeEmail")}
        </Button>
        <Button type="submit" disabled={busy}>
          {p("saveChanges")}
          <Check size={15} />
        </Button>
      </div>
    </form>
  );
}

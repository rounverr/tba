ALTER TABLE session ADD COLUMN authorization_snapshot text;
ALTER TABLE session ADD COLUMN authorization_version bigint;
ALTER TABLE settings ADD COLUMN authorization_version bigint NOT NULL DEFAULT 1;

CREATE FUNCTION tba_role_authorization_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE settings SET authorization_version=authorization_version+1 WHERE id=1;
  RETURN NULL;
END;
$$;
CREATE TRIGGER tba_authorization_role_update
AFTER UPDATE OF id,permissions,is_admin ON role FOR EACH ROW
WHEN (NEW.id IS DISTINCT FROM OLD.id OR NEW.permissions IS DISTINCT FROM OLD.permissions OR NEW.is_admin IS DISTINCT FROM OLD.is_admin)
EXECUTE FUNCTION tba_role_authorization_version();
CREATE TRIGGER tba_authorization_role_change
AFTER INSERT OR DELETE ON role FOR EACH ROW EXECUTE FUNCTION tba_role_authorization_version();

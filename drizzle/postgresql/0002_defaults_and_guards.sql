INSERT INTO role(id,name,is_admin,is_public,permissions) VALUES
 ('administrator','Administrador',true,false,'["app.read","users.read","users.create","users.edit","users.deactivate","roles.manage","settings.manage","audit.read"]'),
 ('editor','Editor',false,false,'["app.read"]'),
 ('viewer','Consulta',false,true,'["app.read"]');
INSERT INTO settings(id,mode,public_role_id) VALUES(1,'closed','viewer');

-- An atomic counter serializes membership changes only. PostgreSQL rechecks
-- the UPDATE predicate after a concurrent writer commits.
CREATE TABLE tba_admin_guard (
  id integer PRIMARY KEY CHECK (id=1),
  active_count bigint NOT NULL CHECK (active_count>=0)
);
INSERT INTO tba_admin_guard VALUES (1, 0);

CREATE FUNCTION tba_admin_delta(delta bigint) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF delta <> 0 THEN
    UPDATE tba_admin_guard SET active_count=active_count+delta
      WHERE id=1 AND (delta>0 OR active_count+delta>0);
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE='23514';
    END IF;
  END IF;
END;
$$;

CREATE FUNCTION tba_guard_user() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  previous integer := 0;
  next integer := 0;
  memberships record;
BEGIN
  IF TG_OP='UPDATE' AND NEW.status=OLD.status AND NEW.role_id IS NOT DISTINCT FROM OLD.role_id THEN
    RETURN NEW;
  END IF;
  -- Prevent a role from changing its admin flag while a user moves into or
  -- out of it. Stable ordering avoids lock inversion on role reassignment.
  FOR memberships IN
    SELECT id,is_admin FROM role WHERE
      (TG_OP <> 'INSERT' AND OLD.status='active' AND id=OLD.role_id) OR
      (TG_OP <> 'DELETE' AND NEW.status='active' AND id=NEW.role_id)
      ORDER BY id FOR SHARE
  LOOP
    IF memberships.is_admin THEN
      IF TG_OP <> 'INSERT' AND OLD.status='active' AND OLD.role_id=memberships.id THEN previous := 1; END IF;
      IF TG_OP <> 'DELETE' AND NEW.status='active' AND NEW.role_id=memberships.id THEN next := 1; END IF;
    END IF;
  END LOOP;
  PERFORM tba_admin_delta(next-previous);
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tba_guard_user AFTER INSERT OR UPDATE OF status,role_id OR DELETE ON "user"
FOR EACH ROW EXECUTE FUNCTION tba_guard_user();

CREATE FUNCTION tba_guard_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  members bigint;
BEGIN
  IF OLD.id='administrator' THEN
    RAISE EXCEPTION 'The administrator role is reserved' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    SELECT count(*) INTO members FROM "user" WHERE status='active' AND role_id=OLD.id;
    PERFORM tba_admin_delta(CASE WHEN NEW.is_admin THEN members ELSE -members END);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tba_guard_role BEFORE UPDATE OR DELETE ON role
FOR EACH ROW EXECUTE FUNCTION tba_guard_role();

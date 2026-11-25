ALTER TABLE session ADD COLUMN authorization_snapshot TEXT;
--> statement-breakpoint
ALTER TABLE session ADD COLUMN authorization_version INTEGER;
--> statement-breakpoint
ALTER TABLE settings ADD COLUMN authorization_version INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint

CREATE TRIGGER authorization_role_update
AFTER UPDATE OF id,permissions,is_admin ON role
WHEN NEW.id IS NOT OLD.id OR NEW.permissions IS NOT OLD.permissions OR NEW.is_admin IS NOT OLD.is_admin
BEGIN
  UPDATE settings SET authorization_version=authorization_version+1 WHERE id=1;
END;
--> statement-breakpoint

CREATE TRIGGER authorization_role_insert
AFTER INSERT ON role
BEGIN
  UPDATE settings SET authorization_version=authorization_version+1 WHERE id=1;
END;
--> statement-breakpoint

CREATE TRIGGER authorization_role_delete
AFTER DELETE ON role
BEGIN
  UPDATE settings SET authorization_version=authorization_version+1 WHERE id=1;
END;

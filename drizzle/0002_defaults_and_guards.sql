INSERT INTO role(id,name,is_admin,is_public,permissions) VALUES
 ('administrator','Administrador',1,0,'["app.read","users.read","users.create","users.edit","users.deactivate","roles.manage","settings.manage","audit.read"]'),
 ('editor','Editor',0,0,'["app.read"]'),
 ('viewer','Consulta',0,1,'["app.read"]');
INSERT INTO settings(id,mode,public_role_id) VALUES(1,'closed','viewer');

CREATE TRIGGER protect_last_administrator_update
BEFORE UPDATE OF status,role_id ON user
WHEN OLD.status='active'
 AND OLD.role_id IN(SELECT id FROM role WHERE is_admin=1)
 AND (NEW.status!='active' OR NEW.role_id IS NULL OR NEW.role_id NOT IN(SELECT id FROM role WHERE is_admin=1))
 AND (SELECT count(*) FROM user WHERE status='active' AND role_id IN(SELECT id FROM role WHERE is_admin=1))<=1
BEGIN SELECT RAISE(ABORT,'Cannot remove the last active administrator'); END;

CREATE TRIGGER protect_last_administrator_delete
BEFORE DELETE ON user
WHEN OLD.status='active'
 AND OLD.role_id IN(SELECT id FROM role WHERE is_admin=1)
 AND (SELECT count(*) FROM user WHERE status='active' AND role_id IN(SELECT id FROM role WHERE is_admin=1))<=1
BEGIN SELECT RAISE(ABORT,'Cannot delete the last active administrator'); END;

CREATE TRIGGER protect_administrator_role_update
BEFORE UPDATE ON role WHEN OLD.id='administrator'
BEGIN SELECT RAISE(ABORT,'The administrator role is reserved'); END;
CREATE TRIGGER protect_administrator_role_delete
BEFORE DELETE ON role WHEN OLD.id='administrator'
BEGIN SELECT RAISE(ABORT,'The administrator role is reserved'); END;

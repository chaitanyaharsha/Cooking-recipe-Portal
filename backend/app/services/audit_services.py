
from app.models.audit_log import AuditLog


def create_audit_log(
    db,
    user_id,
    action,
    entity_type,
    entity_id=None,
    details=None
):
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return audit

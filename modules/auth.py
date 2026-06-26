import os
import hashlib
import secrets
import json
import time
import base64
from datetime import datetime, timedelta
from config import query, execute

SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))
TOKEN_EXPIRY = 7 * 24 * 3600  # 7 days
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@leadmachine.ai")


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split(":")
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return check.hex() == hashed
    except Exception:
        return False


def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": int(time.time()) + TOKEN_EXPIRY,
    }
    data = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hashlib.sha256((data + SECRET_KEY).encode()).hexdigest()[:32]
    return f"{data}.{sig}"


def verify_token(token: str) -> dict | None:
    try:
        data, sig = token.rsplit(".", 1)
        expected = hashlib.sha256((data + SECRET_KEY).encode()).hexdigest()[:32]
        if sig != expected:
            return None
        payload = json.loads(base64.urlsafe_b64decode(data))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def get_user_by_email(email: str) -> dict | None:
    users = query("SELECT * FROM users WHERE email = %s", (email,))
    return users[0] if users else None


def create_user(email: str, password: str, name: str = "") -> dict:
    """Create a new user with 7-day trial. Admin gets 'admin' plan."""
    hashed = hash_password(password)
    trial_end = datetime.now() + timedelta(days=7)

    # Admin gets unlimited access
    if email == ADMIN_EMAIL:
        plan = "admin"
    else:
        plan = "trial"

    execute("""
        INSERT INTO users (email, password_hash, name, plan, trial_ends_at)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
    """, (email, hashed, name, plan, trial_end))
    return get_user_by_email(email)


def get_account_status(email: str) -> dict:
    """Return plan + trial status for gating access."""
    user = get_user_by_email(email)
    if not user:
        return {"valid": False}

    plan = (user.get("plan") or "trial").lower()
    is_admin = (plan == "admin") or (email == ADMIN_EMAIL)
    paid_plans = {"admin", "starter", "growth", "agency"}

    # Admin and paid users never expire
    if is_admin or plan in paid_plans:
        return {
            "valid": True, "plan": plan, "is_admin": is_admin,
            "access": True, "trial_expired": False, "trial_days_left": None,
        }

    # Trial users: check expiry
    trial_end = user.get("trial_ends_at")
    days_left = 0
    expired = True
    if trial_end:
        if isinstance(trial_end, str):
            try:
                trial_end = datetime.fromisoformat(trial_end.replace("Z", "+00:00"))
            except Exception:
                trial_end = None
        if trial_end:
            now = datetime.now(trial_end.tzinfo) if getattr(trial_end, "tzinfo", None) else datetime.now()
            delta = trial_end - now
            days_left = max(0, delta.days + (1 if delta.seconds > 0 and delta.days >= 0 else 0))
            expired = delta.total_seconds() <= 0

    return {
        "valid": True, "plan": "trial", "is_admin": False,
        "access": not expired, "trial_expired": expired,
        "trial_days_left": days_left,
    }


def setup_default_admin():
    """Create default admin if no users exist."""
    users = query("SELECT count(*) as cnt FROM users")
    if users and int(users[0]["cnt"]) == 0:
        admin_email = ADMIN_EMAIL
        admin_pass = os.getenv("ADMIN_PASSWORD", "admin123")
        admin_name = os.getenv("ADMIN_NAME", "Admin")
        create_user(admin_email, admin_pass, admin_name)
        # Ensure admin plan
        execute("UPDATE users SET plan='admin' WHERE email=%s", (admin_email,))
        print(f"  ✓ Default admin created: {admin_email} / {admin_pass}")
        print(f"    Change these in .env: ADMIN_EMAIL, ADMIN_PASSWORD")
    else:
        # Ensure existing admin user has admin plan
        execute("UPDATE users SET plan='admin' WHERE email=%s AND (plan IS NULL OR plan='trial' OR plan='free')", (ADMIN_EMAIL,))
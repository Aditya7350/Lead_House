"""Usage tracking, plan limits, trial system, and admin bypass."""
from config import query, query_one, execute
from datetime import datetime
import os

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@leadmachine.ai")

# ── Plan limits per month ──
PLAN_LIMITS = {
    "trial":   {"leads": 15,    "demos": 2,     "emails": 5,    "ai_chats": 3, "ai_scores": 2,},
    "starter": {"leads": 200,   "demos": 20,    "emails": 100,  "ai_chats": 30, "ai_scores": 2,},
    "growth":  {"leads": 1000,  "demos": 100,   "emails": 500,  "ai_chats": 9999,},
    "agency":  {"leads": 99999, "demos": 99999, "emails": 99999,"ai_chats": 9999,},
    "admin":   {"leads": 99999, "demos": 99999, "emails": 99999,"ai_chats": 9999, "ai_scores":999999},
}

PLAN_INFO = [
    {
        "id": "starter", "name": "Starter", "price": 29, "period": "month",
        "tagline": "Perfect for freelancers getting started",
        "features": ["200 leads / month", "20 demo sites", "100 emails", "30 AI chats", "Google Maps scraping", "Email support"],
    },
    {
        "id": "growth", "name": "Growth", "price": 79, "period": "month", "popular": True,
        "tagline": "For growing agencies closing more deals",
        "features": ["1,000 leads / month", "100 demo sites", "500 emails", "Unlimited AI chats", "Priority support", "Custom branding"],
    },
    {
        "id": "agency", "name": "Agency", "price": 199, "period": "month",
        "tagline": "Unlimited power for large teams",
        "features": ["Unlimited leads", "Unlimited demos", "Unlimited emails", "Unlimited AI chats", "White-label", "Dedicated support"],
    },
]


def is_admin_user(user_id):
    """Check if user is the admin (free unlimited access)."""
    user = query_one("SELECT email FROM users WHERE id=%s", (user_id,))
    return user and user["email"] == ADMIN_EMAIL


def get_user_plan(user_id):
    """Get the user's current plan. Returns 'expired' if trial ended."""
    if is_admin_user(user_id):
        return "admin"

    user = query_one("SELECT plan, trial_ends_at FROM users WHERE id=%s", (user_id,))
    if not user:
        return "trial"

    plan = user.get("plan") or "trial"

    if plan == "trial" and user.get("trial_ends_at"):
        try:
            trial_end = user["trial_ends_at"]
            if isinstance(trial_end, str):
                trial_end = datetime.fromisoformat(trial_end)
            # Compare timezone-naive
            now = datetime.now()
            end = trial_end.replace(tzinfo=None) if hasattr(trial_end, 'replace') else trial_end
            if now > end:
                return "expired"
        except Exception:
            pass  # If any comparison fails, don't block — treat as active trial

    return plan


def get_month_key():
    return datetime.now().strftime("%Y-%m")


def get_usage(user_id):
    """Get current month's usage for a user."""
    month = get_month_key()
    row = query_one(
        "SELECT * FROM user_usage WHERE user_id=%s AND month=%s",
        (user_id, month)
    )
    if not row:
        execute(
            "INSERT INTO user_usage (user_id, month) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, month)
        )
        return {"leads": 0, "demos": 0, "emails": 0, "ai_chats": 0, "month": month}
    return {
        "leads": row.get("leads_count", 0),
        "demos": row.get("demos_count", 0),
        "emails": row.get("emails_count", 0),
        "ai_chats": row.get("ai_chats_count", 0),
        "month": month,
    }


def check_limit(user_id, action):
    """Check if user can perform an action. Returns (allowed, message)."""
    plan = get_user_plan(user_id)

    if plan == "expired":
        return False, "Your free trial has expired. Please upgrade to continue using LeadEmpire."

    if plan == "admin":
        return True, "Admin — unlimited"

    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["trial"])
    usage = get_usage(user_id)

    limit_map = {
        "leads":    ("leads",    limits["leads"]),
        "demos":    ("demos",    limits["demos"]),
        "emails":   ("emails",   limits["emails"]),
        "ai_chats": ("ai_chats", limits["ai_chats"]),
    }

    if action not in limit_map:
        return True, "OK"

    key, limit = limit_map[action]
    current = usage.get(key, 0)

    if current >= limit:
        return False, f"Monthly {action} limit reached ({current}/{limit}). Upgrade your plan for more."

    return True, f"{current + 1}/{limit}"


def increment_usage(user_id, action, count=1):
    """Increment usage counter for an action."""
    month = get_month_key()
    field_map = {
        "leads":    "leads_count",
        "demos":    "demos_count",
        "emails":   "emails_count",
        "ai_chats": "ai_chats_count",
    }
    field = field_map.get(action)
    if not field:
        return

    execute(
        "INSERT INTO user_usage (user_id, month) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        (user_id, month)
    )
    execute(
        f"UPDATE user_usage SET {field} = {field} + %s WHERE user_id=%s AND month=%s",
        (count, user_id, month)
    )


def get_usage_summary(user_id):
    """Full usage summary with limits, plan info, and trial status."""
    plan = get_user_plan(user_id)
    actual_plan = plan if plan != "expired" else "trial"
    limits = PLAN_LIMITS.get(actual_plan, PLAN_LIMITS["trial"])
    usage = get_usage(user_id)

    user = query_one("SELECT trial_ends_at, plan FROM users WHERE id=%s", (user_id,))
    trial_ends = None
    trial_days_left = 0
    if user and user.get("trial_ends_at"):
        try:
            te = user["trial_ends_at"]
            trial_ends = te.isoformat() if hasattr(te, "isoformat") else str(te)
            te_naive = te.replace(tzinfo=None) if hasattr(te, 'replace') else te
            delta = te_naive - datetime.now()
            trial_days_left = max(0, delta.days)
        except Exception:
            pass

    plan_labels = {"trial": "Free Trial", "starter": "Starter", "growth": "Growth",
                   "agency": "Agency", "admin": "Admin", "expired": "Trial Expired"}

    return {
        "plan": plan,
        "plan_label": plan_labels.get(plan, plan.title()),
        "month": usage["month"],
        "trial_ends_at": trial_ends,
        "trial_days_left": trial_days_left,
        "is_admin": plan == "admin",
        "leads":    {"used": usage["leads"],    "limit": limits["leads"]},
        "demos":    {"used": usage["demos"],    "limit": limits["demos"]},
        "emails":   {"used": usage["emails"],   "limit": limits["emails"]},
        "ai_chats": {"used": usage["ai_chats"], "limit": limits["ai_chats"]},
    }
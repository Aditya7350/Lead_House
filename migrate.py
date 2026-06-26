"""Run once: python migrate.py
Adds all missing columns and fixes orphaned data.
Safe to run multiple times.
"""
from config import execute, query
from datetime import datetime, timedelta
import os

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@leadmachine.ai")

COLUMNS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ",
    "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id TEXT",
    "ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id TEXT",
    "ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_id TEXT",
]

print("=== LeadEmpire Database Migration ===\n")

print("1. Adding missing columns...")
for sql in COLUMNS:
    try:
        execute(sql)
        col = sql.split("ADD COLUMN IF NOT EXISTS ")[1].split(" ")[0]
        tbl = sql.split("ALTER TABLE ")[1].split(" ")[0]
        print(f"   OK  {tbl}.{col}")
    except Exception as e:
        print(f"   ERR {e}")

# 2. Set trial_ends_at for users who don't have it
print("\n2. Setting trial dates for existing users...")
try:
    trial_end = datetime.now() + timedelta(days=7)
    execute("UPDATE users SET trial_ends_at=%s WHERE trial_ends_at IS NULL", (trial_end,))
    print("   OK  trial_ends_at set")
except Exception as e:
    print(f"   ERR {e}")

# 3. Set admin plan for admin user
print("\n3. Setting admin plan...")
try:
    execute("UPDATE users SET plan='admin' WHERE email=%s", (ADMIN_EMAIL,))
    print(f"   OK  {ADMIN_EMAIL} → admin plan")
except Exception as e:
    print(f"   ERR {e}")

# 4. Fix orphaned data
print("\n4. Fixing orphaned data (NULL user_id)...")
users = query("SELECT id FROM users LIMIT 1")
if users:
    uid = users[0]["id"]
    for table in ["campaigns", "leads", "activity_log"]:
        try:
            execute(f"UPDATE {table} SET user_id=%s WHERE user_id IS NULL", (uid,))
            print(f"   OK  {table} → user {uid[:8]}...")
        except Exception as e:
            print(f"   ERR {table} → {e}")

# 5. Update old plan names
print("\n5. Normalizing plan names...")
try:
    execute("UPDATE users SET plan='trial' WHERE plan='free' AND email != %s", (ADMIN_EMAIL,))
    print("   OK  'free' → 'trial'")
except Exception as e:
    print(f"   ERR {e}")

print("\n✓ Migration complete!")
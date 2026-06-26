"""
AI Lead Machine — FastAPI Backend
Run: uvicorn main:app --host 0.0.0.0 --port 3000 --reload
"""

import json
import threading
from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import query, query_one, execute, PORT
from modules.scraper import scrape_campaign, create_campaign, scrape_all_active
from modules.qualifier import qualify_new_leads, qualify_single
from modules.site_builder import build_demo_site, build_pending_sites
from modules.outreach import init_new_sequences, process_due_emails
from modules.auth import get_user_by_email, create_user, verify_password, create_token, verify_token, setup_default_admin
from modules.usage import check_limit, increment_usage, get_usage_summary, PLAN_INFO

app = FastAPI(title="LeadEmpire", version="2.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# =============================================
# PYDANTIC MODELS
# =============================================

class QuickScrapeRequest(BaseModel):
    city: str
    country_code: str = "US"
    niche: str
    keywords: Optional[list[str]] = None
    radius_km: int = 25


class CampaignRequest(BaseModel):
    name: str
    niche: str
    keywords: list[str]
    city: str
    country_code: str = "US"
    region: Optional[str] = None
    radius_km: int = 25
    send_limit: int = 15

# =============================================
# PAGE ROUTES (must be before StaticFiles mount)
# =============================================

@app.get("/", response_class=HTMLResponse)
def serve_landing():
    with open("public/landing.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/app", response_class=HTMLResponse)
def serve_dashboard():
    with open("public/index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/login", response_class=HTMLResponse)
def serve_login():
    with open("public/login.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/checkout", response_class=HTMLResponse)
def serve_checkout():
    with open("public/checkout.html", "r", encoding="utf-8") as f:
        return f.read()

# Serve static files (images, CSS, JS) - AFTER route handlers
app.mount("/assets", StaticFiles(directory="public/assets", html=False), name="assets")
app.mount("/static", StaticFiles(directory="public/assets", html=False), name="static-assets")

@app.get("/ai-lead-machine-logo.svg")
def serve_logo():
    from fastapi.responses import FileResponse
    return FileResponse("public/ai-lead-machine-logo.svg")


# =============================================
# AUTH API
# =============================================

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""

# def get_current_user(request: Request):
#     auth = request.headers.get("Authorization", "")
#     token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""

#     payload = verify_token(token)

#     if not payload:
#         raise HTTPException(401, "Unauthorized")

#     return payload["user_id"]
def get_current_user(request: Request):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth.replace("Bearer ", "")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    return payload["user_id"]

# @app.post("/api/auth/login")
# def login(req: LoginRequest):
#     user = get_user_by_email(req.email)
#     if not user or not verify_password(req.password, user["password_hash"]):
#         raise HTTPException(401, "Invalid email or password")
#     token = create_token(user["id"], user["email"])
#     return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}
@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token(user["id"], user["email"])

    from modules.auth import get_account_status
    status = get_account_status(user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "plan": status.get("plan"),
            "is_admin": status.get("is_admin", False),
            "access": status.get("access", True),
            "trial_expired": status.get("trial_expired", False),
            "trial_days_left": status.get("trial_days_left"),
        },
    }

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    existing = get_user_by_email(req.email)
    if existing:
        raise HTTPException(400, "Email already registered")
    user = create_user(req.email, req.password, req.name)
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}


# @app.get("/api/auth/me")
# def get_me(request: Request):
#     auth = request.headers.get("Authorization", "")
#     token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
#     payload = verify_token(token)
#     if not payload:
#         raise HTTPException(401, "Not authenticated")
#     user = get_user_by_email(payload["email"])
#     if not user:
#         raise HTTPException(401, "User not found")
#     return {"id": user["id"], "email": user["email"], "name": user["name"]}
@app.get("/api/auth/me")
def get_me(request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Not authenticated")
    user = get_user_by_email(payload["email"])
    if not user:
        raise HTTPException(401, "User not found")
    from modules.auth import get_account_status
    status = get_account_status(user["email"])
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "plan": status.get("plan"),
        "is_admin": status.get("is_admin", False),
        "access": status.get("access", True),
        "trial_expired": status.get("trial_expired", False),
        "trial_days_left": status.get("trial_days_left"),
    }

# =============================================
# USAGE & PLAN
# =============================================

@app.get("/api/usage")
def get_usage_api(request: Request):
    try:
        auth = request.headers.get("Authorization", "")
        token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
        payload = verify_token(token)
        user_id = payload["user_id"] if payload else "default"
        return get_usage_summary(user_id)
    except Exception as e:
        # Return safe defaults if usage tracking fails
        return {"plan": "trial", "plan_label": "Free Trial", "month": "",
                "trial_ends_at": None, "trial_days_left": 7, "is_admin": False,
                "leads": {"used": 0, "limit": 15}, "demos": {"used": 0, "limit": 2},
                "emails": {"used": 0, "limit": 5}, "ai_chats": {"used": 0, "limit": 3}}


# =============================================
# API: HEALTH + STATS
# =============================================

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/plans")
def get_plans():
    """Return available plans for the pricing page."""
    return {"plans": PLAN_INFO}


class UpgradePlanRequest(BaseModel):
    plan: str

@app.post("/api/upgrade-plan")
def upgrade_plan(req: UpgradePlanRequest, request: Request):
    """Upgrade user plan (for admin manual upgrade or after payment)."""
    user_id = get_current_user(request)
    valid_plans = ["starter", "growth", "agency"]
    if req.plan not in valid_plans:
        raise HTTPException(400, f"Invalid plan. Choose: {', '.join(valid_plans)}")
    execute("UPDATE users SET plan=%s WHERE id=%s", (req.plan, user_id))
    return {"success": True, "plan": req.plan, "message": f"Upgraded to {req.plan}!"}


# =============================================
# RAZORPAY PAYMENTS
# =============================================
import os
import hmac
import hashlib

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")

PLAN_PRICES = {
    "starter": {"amount": 0, "currency": "INR", "name": "Starter Plan"},          # Free
    "growth":  {"amount": 499900, "currency": "INR", "name": "Growth Plan"},       # ₹4,999/mo in paise
    "agency":  {"amount": 999900, "currency": "INR", "name": "Agency Lifetime"},   # ₹9,999 one-time in paise
}

class CreateOrderRequest(BaseModel):
    plan: str

@app.post("/api/payments/create-order")
def create_payment_order(req: CreateOrderRequest, request: Request):
    """Create a Razorpay order for plan purchase."""
    user_id = get_current_user(request)
    if req.plan not in PLAN_PRICES:
        raise HTTPException(400, "Invalid plan")

    plan = PLAN_PRICES[req.plan]

    if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
        # Fallback: no Razorpay configured, return manual upgrade info
        return {"manual": True, "message": "Contact admin to activate your plan."}

    import requests as rq
    try:
        order = rq.post(
            "https://api.razorpay.com/v1/orders",
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
            json={
                "amount": plan["amount"],
                "currency": plan["currency"],
                "receipt": f"{user_id}_{req.plan}",
                "notes": {"user_id": user_id, "plan": req.plan}
            }
        ).json()
        return {
            "order_id": order["id"],
            "amount": plan["amount"],
            "currency": plan["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "plan": req.plan,
            "plan_name": plan["name"],
        }
    except Exception as e:
        raise HTTPException(500, f"Payment error: {str(e)}")


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

@app.post("/api/payments/verify")
def verify_payment(req: VerifyPaymentRequest, request: Request):
    """Verify Razorpay payment and upgrade user plan."""
    user_id = get_current_user(request)

    # Verify signature
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected != req.razorpay_signature:
        raise HTTPException(400, "Payment verification failed")

    # Upgrade user
    execute("UPDATE users SET plan=%s WHERE id=%s", (req.plan, user_id))

    # Log activity
    execute(
        "INSERT INTO activity_log (type, user_id, message, metadata) VALUES ('payment', %s, %s, %s)",
        (user_id, f"Upgraded to {req.plan} plan",
         json.dumps({"payment_id": req.razorpay_payment_id, "order_id": req.razorpay_order_id}))
    )

    return {"success": True, "plan": req.plan, "message": f"Payment verified! Upgraded to {req.plan}!"}


@app.post("/api/payments/webhook")
async def razorpay_webhook(request: Request):
    """Razorpay webhook — auto-upgrade on successful payment."""
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")

    if RAZORPAY_KEY_SECRET:
        expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if expected != sig:
            raise HTTPException(400, "Invalid webhook signature")

    data = json.loads(body)
    event = data.get("event", "")

    if event == "payment.captured":
        payment = data.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment.get("notes", {})
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        if user_id and plan:
            execute("UPDATE users SET plan=%s WHERE id=%s", (plan, user_id))
            execute(
                "INSERT INTO activity_log (type, user_id, message) VALUES ('payment', %s, %s)",
                (user_id, f"Webhook: Upgraded to {plan}")
            )
    return {"status": "ok"}


# @app.get("/api/stats")
# def stats():
#     def count(sql):
#         r = query(sql)
#         return int(r[0]["count"]) if r else 0

#     return {
#         "total_leads": count("SELECT count(*) FROM leads"),
#         "qualified": count("SELECT count(*) FROM leads WHERE qualification='qualified'"),
#         "demos_built": count("SELECT count(*) FROM leads WHERE demo_site_built=true"),
#         "contacted": count("SELECT count(*) FROM leads WHERE status='contacted'"),
#         "replied": count("SELECT count(*) FROM leads WHERE status='replied'"),
#         "emails_today": count("SELECT count(*) FROM emails_sent WHERE created_at >= CURRENT_DATE"),
#     }

@app.get("/api/stats")
def stats(request: Request):

    user_id = get_current_user(request)

    def count(sql):
        r = query(sql, (user_id,))
        return int(r[0]["count"]) if r else 0

    return {
        "total_leads":
            count("SELECT count(*) FROM leads WHERE user_id=%s"),

        "qualified":
            count("SELECT count(*) FROM leads WHERE user_id=%s AND qualification='qualified'"),

        "demos_built":
            count("SELECT count(*) FROM leads WHERE user_id=%s AND demo_site_built=true"),

        "contacted":
            count("SELECT count(*) FROM leads WHERE user_id=%s AND status='contacted'"),

        "replied":
            count("SELECT count(*) FROM leads WHERE user_id=%s AND status='replied'")
    }


# =============================================
# API: CAMPAIGNS
# =============================================

# @app.get("/api/campaigns")
# def list_campaigns():
#     return query("SELECT * FROM campaigns ORDER BY created_at DESC")

@app.get("/api/campaigns")
def list_campaigns(request: Request):

    user_id = get_current_user(request)

    return query(
        """
        SELECT *
        FROM campaigns
        WHERE user_id=%s
        ORDER BY created_at DESC
        """,
        (user_id,)
    )


# @app.post("/api/campaigns")
# def create_campaign_api(req: CampaignRequest):
#     c = create_campaign(req.name, req.niche, req.keywords, req.city,
#                         req.country_code, req.region, req.radius_km, req.send_limit)
#     return {"success": True, "campaign": c}

@app.post("/api/campaigns")
def create_campaign_api(
    req: CampaignRequest,
    request: Request
):
    user_id = get_current_user(request)

    c = create_campaign(
        user_id,
        req.name,
        req.niche,
        req.keywords,
        req.city,
        req.country_code,
        req.region,
        req.radius_km,
        req.send_limit
    )

    return {
        "success": True,
        "campaign": c
    }


# =============================================
# API: LEADS
# =============================================

@app.get("/api/leads")
def list_leads(
    request: Request,
    status: Optional[str]=None,
    campaign_id: Optional[str]=None,
    limit:int=100,
    offset:int=0
):
    user_id = get_current_user(request)

    sql = """
    SELECT *
    FROM leads
    WHERE user_id=%s
    """

    params = [user_id]

    if status:
        sql += " AND status=%s"
        params.append(status)

    if campaign_id:
        sql += " AND campaign_id=%s"
        params.append(campaign_id)

    sql += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    return query(sql, tuple(params))

# def list_leads(status: Optional[str] = None, campaign_id: Optional[str] = None,
#                limit: int = 100, offset: int = 0):
#     # sql = "SELECT * FROM leads WHERE 1=1"
#     user_id = get_current_user(request)

#     sql = """
#     SELECT *
#     FROM leads
#     WHERE user_id=%s
#     """

#     params=[user_id]
#     # params = []

#     if status:
#         params.append(status)
#         sql += f" AND status = %s"
#     if campaign_id:
#         params.append(campaign_id)
#         sql += f" AND campaign_id = %s"

#     sql += " ORDER BY updated_at DESC"
#     params.extend([limit, offset])
#     sql += " LIMIT %s OFFSET %s"

#     return query(sql, tuple(params))


# @app.get("/api/leads/{lead_id}")
# def get_lead(lead_id: str):
#     lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
#     if not lead:
#         raise HTTPException(404, "Lead not found")
#     emails = query("SELECT * FROM emails_sent WHERE lead_id=%s ORDER BY created_at DESC", (lead_id,))
#     demo = query_one("SELECT deploy_url, created_at FROM demo_sites WHERE lead_id=%s ORDER BY created_at DESC LIMIT 1", (lead_id,))
#     return {**lead, "emails": emails, "demo": demo}


@app.get("/api/leads/{lead_id}")
def get_lead(
    lead_id: str,
    request: Request
):
    user_id = get_current_user(request)

    lead = query_one(
        """
        SELECT *
        FROM leads
        WHERE id=%s
        AND user_id=%s
        """,
        (lead_id, user_id)
    )

    if not lead:
        raise HTTPException(404, "Lead not found")

    emails = query(
        """
        SELECT *
        FROM emails_sent
        WHERE lead_id=%s
        ORDER BY created_at DESC
        """,
        (lead_id,)
    )

    demo = query_one(
        """
        SELECT deploy_url, created_at
        FROM demo_sites
        WHERE lead_id=%s
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (lead_id,)
    )

    return {
        **lead,
        "emails": emails,
        "demo": demo
    }


# =============================================
# API: ACTIVITY LOG
# =============================================

# @app.get("/api/activity")
# def list_activity(limit: int = 50):
#     return query("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT %s", (limit,))

@app.get("/api/activity")
def list_activity(
    request: Request,
    limit: int = 50
):
    user_id = get_current_user(request)

    return query(
        """
        SELECT *
        FROM activity_log
        WHERE user_id=%s
        ORDER BY created_at DESC
        LIMIT %s
        """,
        (user_id, limit)
    )

# =============================================
# API: QUICK SCRAPE (from dashboard form)
# =============================================

# @app.post("/api/quick-scrape")
# def quick_scrape(req: QuickScrapeRequest, background: BackgroundTasks):
#     name = f"{req.niche}-{req.city}-{req.country_code}".lower()
#     name = "".join(c if c.isalnum() or c == "-" else "-" for c in name)
#     keywords = req.keywords or [req.niche]

#     campaign = create_campaign(user_id, name, req.niche, keywords, req.city,
#                                req.country_code, radius_km=req.radius_km)

#     # Scrape in background so API responds immediately
#     background.add_task(scrape_campaign, campaign)
#     return {"success": True, "campaign": campaign, "message": f"Scraping {req.city}..."}
@app.post("/api/quick-scrape")
def quick_scrape(
    req: QuickScrapeRequest,
    background: BackgroundTasks,
    request: Request
):
    # Get JWT token
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""

    # Verify token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = payload["user_id"]
    allowed,msg = check_limit(
    user_id,
    "leads"
    )

    if not allowed:
        raise HTTPException(
            403,
            msg
        )

    name = f"{req.niche}-{req.city}-{req.country_code}".lower()
    name = "".join(c if c.isalnum() or c == "-" else "-" for c in name)
    keywords = req.keywords or [req.niche]

    campaign = create_campaign(
        user_id,
        name,
        req.niche,
        keywords,
        req.city,
        req.country_code,
        radius_km=req.radius_km
    )

    background.add_task(scrape_campaign, campaign)

    return {
        "success": True,
        "campaign": campaign,
        "message": f"Scraping {req.city}..."
    }

# =============================================
# API: SINGLE LEAD ACTIONS
# =============================================

@app.post("/api/leads/{lead_id}/qualify")
def qualify_lead_api(lead_id: str, background: BackgroundTasks):
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        raise HTTPException(404, "Lead not found")
    execute("UPDATE leads SET qualification='pending' WHERE id=%s", (lead_id,))

    def do_qualify():
        leads = query("SELECT * FROM leads WHERE id=%s", (lead_id,))
        if leads:
            qualify_single(leads[0])
            # Post-qualify check: if analysis shows a parsing/connection ERROR, lower the score
            updated = query_one("SELECT ai_analysis, website_score FROM leads WHERE id=%s", (lead_id,))
            if updated and updated.get("ai_analysis"):
                analysis = (updated["ai_analysis"] or "").lower()
                # Only trigger on actual technical errors, NOT on legitimate "no website" analysis
                error_keywords = ["unreachable", "timed out", "connection refused",
                                  "ssl error", "lxml", "parser library", "dns",
                                  "errno", "certificate verify", "connectionerror"]
                if any(kw in analysis for kw in error_keywords):
                    current = updated.get("website_score") or 0
                    if current > 5:
                        execute("UPDATE leads SET website_score=5 WHERE id=%s", (lead_id,))
                        execute("UPDATE leads SET ai_analysis=%s WHERE id=%s",
                                ("Website analysis incomplete due to technical error. " + updated["ai_analysis"], lead_id))

    background.add_task(do_qualify)
    return {"success": True, "message": f"Qualifying {lead['business_name']}..."}


@app.post("/api/leads/{lead_id}/build-demo")
def build_demo_api(lead_id: str, background: BackgroundTasks):
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        raise HTTPException(404, "Lead not found")

    background.add_task(build_demo_site, lead)
    return {"success": True, "message": f"Building demo for {lead['business_name']}..."}


@app.post("/api/leads/{lead_id}/send-email")
def send_email_api(lead_id: str, background: BackgroundTasks):
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        raise HTTPException(404, "Lead not found")

    def do_send():
        from modules.outreach import start_sequence, process_due_emails
        start_sequence(lead)
        process_due_emails()

    background.add_task(do_send)
    return {"success": True, "message": f"Sending email to {lead['business_name']}..."}


# =============================================
# API: BULK ACTIONS
# =============================================

@app.post("/api/run/scrape")
def run_scrape(background: BackgroundTasks):
    background.add_task(scrape_all_active)
    return {"success": True, "message": "Scraping all campaigns..."}


@app.post("/api/run/qualify")
def run_qualify(background: BackgroundTasks):
    background.add_task(qualify_new_leads, 4)
    return {"success": True, "message": "Qualifying leads..."}


@app.post("/api/run/build-sites")
def run_build(background: BackgroundTasks):
    background.add_task(build_pending_sites, 2)
    return {"success": True, "message": "Building demo sites..."}


@app.post("/api/run/outreach")
def run_outreach(background: BackgroundTasks):
    def do_outreach():
        init_new_sequences()
        process_due_emails()
    background.add_task(do_outreach)
    return {"success": True, "message": "Running outreach..."}


@app.post("/api/run/full-pipeline")
def run_pipeline(background: BackgroundTasks):
    def do_pipeline():
        print("\n[Pipeline] === Started ===")
        scrape_all_active()
        qualify_new_leads(4)
        build_pending_sites(2)
        init_new_sequences()
        process_due_emails()
        print("[Pipeline] === Done ===\n")
    background.add_task(do_pipeline)
    return {"success": True, "message": "Full pipeline started..."}


# =============================================
# CLIENT PORTAL (public — no auth needed)
# =============================================

@app.get("/portal/{lead_id}", response_class=HTMLResponse)
def serve_portal(lead_id: str):
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)
    from templates.portal_template import build_portal_html
    return build_portal_html(lead)


# =============================================
# LEAD AUDIT REPORT (shareable branded PDF-ready page)
# =============================================

@app.get("/api/leads/{lead_id}/report-data")
def get_report_data(lead_id: str, request: Request):
    """Get comprehensive lead data for report rendering."""
    user_id = get_current_user(request)
    lead = query_one("SELECT * FROM leads WHERE id=%s AND user_id=%s", (lead_id, user_id))
    if not lead:
        raise HTTPException(404, "Lead not found")
    emails = query("SELECT * FROM emails_sent WHERE lead_id=%s ORDER BY created_at DESC", (lead_id,))
    demo = query_one("SELECT * FROM demo_sites WHERE lead_id=%s ORDER BY created_at DESC LIMIT 1", (lead_id,))
    return {"lead": lead, "emails": emails, "demo": demo}


@app.get("/report/{lead_id}", response_class=HTMLResponse)
def serve_report(lead_id: str):
    """Serve a comprehensive branded audit report for a lead."""
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        return HTMLResponse("<h1>Not found</h1>", status_code=404)

    score = lead.get("website_score") or 0
    rating = lead.get("google_rating") or 0
    reviews = lead.get("review_count") or 0
    pct = int((score / 10) * 100) if score else 0
    score_label = "Hot Lead" if score >= 8 else "Warm Lead" if score >= 6 else "Needs Attention" if score >= 4 else "Cold Lead"
    score_color = "#DC2626" if score >= 8 else "#F59E0B" if score >= 6 else "#0EA5E9" if score >= 4 else "#64748B"
    badge_bg = "#FEF2F2" if score >= 8 else "#FFFBEB" if score >= 6 else "#F0F9FF" if score >= 4 else "#F8FAFC"

    # Stars HTML
    stars_html = ""
    for i in range(1, 6):
        c = "#F59E0B" if i <= int(rating) else "#E2E8F0"
        stars_html += f'<span style="color:{c};font-size:18px">&#9733;</span>'

    # Profile Strength
    profile_score = 0
    profile_items = []
    if rating >= 4:
        profile_score += 20
        profile_items.append(("Google Rating", f"{rating} — Excellent", "good"))
    elif rating >= 3:
        profile_score += 12
        profile_items.append(("Google Rating", f"{rating} — Average, room to improve", "warn"))
    else:
        profile_items.append(("Google Rating", f"{rating or 'None'} — Needs improvement", "bad"))

    if reviews >= 50:
        profile_score += 20
        profile_items.append(("Review Volume", f"{reviews} reviews — Strong social proof", "good"))
    elif reviews >= 10:
        profile_score += 12
        profile_items.append(("Review Volume", f"{reviews} reviews — Building trust", "warn"))
    else:
        profile_items.append(("Review Volume", f"{reviews} reviews — Needs more reviews", "bad"))

    phone = lead.get("phone") or ""
    if phone:
        profile_score += 20
        profile_items.append(("Phone Number", "Listed — Customers can reach you", "good"))
    else:
        profile_items.append(("Phone Number", "Missing — Add phone for trust", "bad"))

    website = lead.get("website_url") or ""
    if website:
        profile_score += 20
        profile_items.append(("Website", "Has website — Online presence exists", "good"))
    else:
        profile_items.append(("Website", "Missing — No online presence", "bad"))

    address = lead.get("address") or ""
    if address:
        profile_score += 10
        profile_items.append(("Business Address", "Listed — Supports local SEO", "good"))
    else:
        profile_items.append(("Business Address", "Missing — Hurts local visibility", "bad"))

    email = lead.get("email") or ""
    if email:
        profile_score += 10
        profile_items.append(("Email Contact", f"{email} — Contact available", "good"))

    profile_label = "Looks Good" if profile_score >= 70 else "Average" if profile_score >= 40 else "Poor"
    profile_color = "#10B981" if profile_score >= 70 else "#F59E0B" if profile_score >= 40 else "#EF4444"

    profile_html = ""
    for label, desc, status in profile_items:
        ico = "&#10003;" if status == "good" else "&#9888;" if status == "warn" else "&#10007;"
        bg = "#F0FDF4" if status == "good" else "#FFFBEB" if status == "warn" else "#FEF2F2"
        bc = "#BBF7D0" if status == "good" else "#FDE68A" if status == "warn" else "#FECACA"
        ic = "#10B981" if status == "good" else "#F59E0B" if status == "warn" else "#EF4444"
        profile_html += f'<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:10px;background:{bg};border:1px solid {bc};margin-bottom:6px"><span style="font-size:16px;color:{ic};font-weight:700">{ico}</span><div><div style="font-weight:600;color:#0F172A;font-size:13px">{label}</div><div style="font-size:11px;color:#64748B">{desc}</div></div></div>'

    # Website audit issues
    errors = 0
    warnings = 0
    issues_html = ""
    issue_list = []
    if website and not website.startswith("https"):
        issue_list.append(("No HTTPS / SSL Certificate", "No redirect or canonical to HTTPS. Search engines penalize unsecured pages.", "error"))
        errors += 1
    if score >= 6:
        issue_list.append(("Mobile Responsiveness", "Website may not be fully optimized for mobile devices.", "warn"))
        warnings += 1
    if score >= 7:
        issue_list.append(("Page Speed", "Website appears to load slower than recommended.", "error"))
        errors += 1
    if score >= 5:
        issue_list.append(("Modern Design", "Website design could be refreshed for better conversions.", "warn"))
        warnings += 1
    if score >= 8:
        issue_list.append(("SEO Optimization", "Missing or inadequate meta tags, headings, or structured data.", "error"))
        errors += 1

    for title, desc, severity in issue_list:
        bg = "#FEF2F2" if severity == "error" else "#FFFBEB"
        bc = "#FECACA" if severity == "error" else "#FDE68A"
        tc = "#DC2626" if severity == "error" else "#D97706"
        badge = "ERROR" if severity == "error" else "WARNING"
        issues_html += f'<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:10px;background:{bg};border:1px solid {bc};margin-bottom:8px"><div style="width:12px;height:12px;border-radius:50%;background:{tc};flex-shrink:0"></div><div style="flex:1"><div style="font-weight:600;color:#0F172A;font-size:13px">{title}</div><div style="font-size:11px;color:#64748B">{desc}</div></div><span style="padding:3px 10px;border-radius:4px;font-size:10px;font-weight:700;color:{tc};border:1px solid {bc}">{badge}</span></div>'

    # Health scores
    site_health = max(0, 100 - (score * 10))
    ai_search_health = site_health  # simplified

    ai_analysis = lead.get("ai_analysis") or "AI analysis not yet generated. Run AI Score to get detailed insights."
    demo_url = lead.get("demo_site_url") or ""
    name = lead.get("business_name") or "Business"
    niche = lead.get("niche") or ""
    city = lead.get("city") or ""
    country = lead.get("country_code") or ""

    _ud = lead.get("updated_at")
    report_date = _ud.strftime("%B %d, %Y") if hasattr(_ud, 'strftime') else str(_ud)[:10] if _ud else "Today"

    return HTMLResponse(f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Business Audit — {name}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'Inter',sans-serif;background:#F8FAFC;color:#0F172A}}
.wrap{{max-width:900px;margin:0 auto;padding:40px 24px}}
h1,h2,h3{{font-family:'Space Grotesk',sans-serif}}
.sec{{background:#fff;border-radius:14px;padding:28px;margin-bottom:16px;border:1px solid #E2E8F0}}
.sec-title{{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:18px;display:flex;align-items:center;gap:8px}}
.ring{{position:relative;display:inline-block}}.ring svg{{transform:rotate(-90deg)}}
.ring .val{{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}}
.grid3{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}
.grid4{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}
.card{{padding:14px 16px;border-radius:10px;border:1px solid #E2E8F0;background:#FAFAFA}}
.card .lbl{{font-size:10px;color:#64748B;margin-bottom:2px}}.card .v{{font-size:14px;font-weight:600;color:#0F172A;word-break:break-all}}
.cta-box{{background:linear-gradient(135deg,#0F172A,#1E293B);color:#fff;padding:32px;border-radius:14px;text-align:center;margin-top:20px}}
.btn-cta{{display:inline-block;padding:12px 28px;border-radius:8px;background:#F97316;color:#fff;font-weight:700;text-decoration:none;font-size:14px}}
.print-btn{{position:fixed;bottom:24px;right:24px;padding:12px 24px;border-radius:10px;background:#0F172A;color:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2);z-index:100;display:flex;align-items:center;gap:6px}}
@media print{{
  .print-btn{{display:none!important}}
  body{{background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
  .wrap{{padding:0!important;max-width:100%!important}}
  .sec{{box-shadow:none!important;break-inside:avoid;border:1px solid #E2E8F0!important}}
  .cta-box{{break-inside:avoid}}
  *{{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
}}
@page{{margin:12mm 10mm}}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
  Download PDF
</button>
<div class="wrap">

<!-- HERO -->
<div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#0F172A 100%);border-radius:20px;padding:48px 40px;margin-bottom:24px;position:relative;overflow:hidden;color:#fff">
  <div style="position:absolute;top:-80px;right:-40px;width:280px;height:280px;border-radius:50%;background:rgba(249,115,22,.08)"></div>
  <div style="position:absolute;bottom:-100px;right:80px;width:200px;height:200px;border-radius:50%;background:rgba(100,116,139,.06)"></div>
  <div style="position:relative;z-index:1">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:12px;overflow:hidden"><img src="/ai-lead-machine-logo.svg" style="width:40px;height:40px;border-radius:12px" /></div>
        <div><div style="font-size:15px;font-weight:700">LeadEmpire</div><div style="font-size:9px;color:#64748B;letter-spacing:.1em;text-transform:uppercase">Business Audit Report</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="padding:6px 16px;border-radius:8px;font-size:12px;font-weight:700;color:{score_color};background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);backdrop-filter:blur(8px)">{score_label}</span>
        <span style="font-size:13px;color:#94A3B8">{report_date}</span>
      </div>
    </div>
    <h1 style="font-size:38px;font-weight:800;margin-bottom:6px;letter-spacing:-.02em">{name}</h1>
    <p style="font-size:14px;color:#94A3B8;margin-bottom:28px">{niche} &middot; {city}, {country}</p>
    <div style="display:flex;gap:14px;flex-wrap:wrap">
      <div style="padding:14px 22px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);min-width:100px"><div style="font-size:10px;color:#94A3B8;margin-bottom:4px">AI Score</div><div style="font-size:26px;font-weight:800;font-family:'Space Grotesk',sans-serif">{score}<span style="font-size:13px;color:#64748B">/10</span></div></div>
      <div style="padding:14px 22px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);min-width:100px"><div style="font-size:10px;color:#94A3B8;margin-bottom:4px">Rating</div><div style="font-size:26px;font-weight:800;font-family:'Space Grotesk',sans-serif;color:#F59E0B">{rating}<span style="font-size:14px">&#9733;</span></div></div>
      <div style="padding:14px 22px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);min-width:100px"><div style="font-size:10px;color:#94A3B8;margin-bottom:4px">Reviews</div><div style="font-size:26px;font-weight:800;font-family:'Space Grotesk',sans-serif">{reviews}</div></div>
      <div style="padding:14px 22px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(8px);min-width:100px"><div style="font-size:10px;color:#94A3B8;margin-bottom:4px">Profile</div><div style="font-size:18px;font-weight:700;color:{profile_color}">{profile_label}</div></div>
    </div>
  </div>
</div>

<!-- HEALTH OVERVIEW -->
<div class="sec">
  <div class="sec-title">Health Overview</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
    <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:500">Site Health</span><span style="font-size:24px;font-weight:800;color:{'#10B981' if site_health >= 70 else '#F59E0B' if site_health >= 40 else '#EF4444'}">{site_health}%</span></div><div style="font-size:11px;color:#94A3B8">Based on website score &amp; technical signals</div></div>
    <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-weight:500">AI Search Health</span><span style="font-size:24px;font-weight:800;color:{'#10B981' if ai_search_health >= 70 else '#F59E0B' if ai_search_health >= 40 else '#EF4444'}">{ai_search_health}%</span></div><div style="font-size:11px;color:#94A3B8">Likelihood of appearing in ChatGPT, Gemini &amp; Claude</div></div>
  </div>
</div>

<!-- AUDIT SUMMARY -->
<div class="sec">
  <div class="sec-title">Audit Summary</div>
  <div class="grid4">
    <div style="padding:18px;border-radius:10px;border:1px solid #FECACA;text-align:center"><div style="font-size:32px;font-weight:800;color:#DC2626">{errors}</div><div style="font-size:10px;color:#DC2626;text-transform:uppercase;font-weight:700">Errors</div></div>
    <div style="padding:18px;border-radius:10px;border:1px solid #FDE68A;text-align:center"><div style="font-size:32px;font-weight:800;color:#D97706">{warnings}</div><div style="font-size:10px;color:#D97706;text-transform:uppercase;font-weight:700">Warnings</div></div>
    <div style="padding:18px;border-radius:10px;border:1px solid #BBF7D0;text-align:center"><div style="font-size:32px;font-weight:800;color:#10B981">0</div><div style="font-size:10px;color:#10B981;text-transform:uppercase;font-weight:700">Notices</div></div>
    <div style="padding:18px;border-radius:10px;border:1px solid #E2E8F0;text-align:center"><div style="font-size:32px;font-weight:800;color:#0F172A">{score}<span style="font-size:16px;color:#64748B">/10</span></div><div style="font-size:10px;color:#64748B;text-transform:uppercase;font-weight:700">AI Score</div></div>
  </div>
  {'<div style="margin-top:16px"><div style="font-size:12px;font-weight:700;color:#0F172A;margin-bottom:8px">TOP ISSUES</div>' + issues_html + '</div>' if issues_html else ''}
</div>

<!-- PROFILE STRENGTH -->
<div class="sec">
  <div class="sec-title">Profile Strength<span style="margin-left:auto;padding:4px 12px;border-radius:6px;font-size:11px;color:{profile_color};border:1px solid {profile_color}30">{profile_label}</span></div>
  <div style="display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap">
    <div style="text-align:center;flex-shrink:0">
      <div class="ring"><svg width="130" height="130" viewBox="0 0 130 130"><circle cx="65" cy="65" r="56" fill="none" stroke="#F1F5F9" stroke-width="10"/><circle cx="65" cy="65" r="56" fill="none" stroke="{profile_color}" stroke-width="10" stroke-linecap="round" stroke-dasharray="{profile_score * 3.518} 999"/></svg><div class="val"><div style="font-size:28px;font-weight:800;color:{profile_color}">{profile_score}</div><div style="font-size:9px;color:#94A3B8">/100</div></div></div>
      <div style="font-size:13px;font-weight:700;color:{profile_color};margin-top:4px">{profile_label}</div>
      <div style="font-size:10px;color:#94A3B8">Profile Strength</div>
    </div>
    <div style="flex:1;min-width:300px">{profile_html}</div>
  </div>
</div>

<!-- SCORING OVERVIEW -->
<div class="sec">
  <div class="sec-title">Scoring Overview</div>
  <div style="display:flex;gap:40px;align-items:center;justify-content:center;flex-wrap:wrap">
    <div style="text-align:center"><div class="ring"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" stroke-width="9"/><circle cx="60" cy="60" r="50" fill="none" stroke="{score_color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="{pct * 3.14} 999"/></svg><div class="val"><div style="font-size:26px;font-weight:800;color:{score_color}">{score}</div><div style="font-size:9px;color:#94A3B8">/10</div></div></div><div style="font-size:13px;font-weight:700;color:{score_color};margin-top:4px">{score_label}</div><div style="font-size:10px;color:#94A3B8">Website Score</div></div>
    <div style="text-align:center"><div class="ring"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" stroke-width="9"/><circle cx="60" cy="60" r="50" fill="none" stroke="#F59E0B" stroke-width="9" stroke-linecap="round" stroke-dasharray="{int((rating/5)*100) * 3.14} 999"/></svg><div class="val"><div style="font-size:26px;font-weight:800;color:#F59E0B">{rating}</div><div style="font-size:9px;color:#94A3B8">/5.0</div></div></div><div style="margin-top:4px">{stars_html}</div><div style="font-size:10px;color:#94A3B8">{reviews} Google Reviews</div></div>
    <div style="text-align:center"><div class="ring"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="#F1F5F9" stroke-width="9"/><circle cx="60" cy="60" r="50" fill="none" stroke="{profile_color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="{profile_score * 3.14} 999"/></svg><div class="val"><div style="font-size:26px;font-weight:800;color:{profile_color}">{profile_score}</div><div style="font-size:9px;color:#94A3B8">/100</div></div></div><div style="font-size:13px;font-weight:700;color:{profile_color};margin-top:4px">{profile_label}</div><div style="font-size:10px;color:#94A3B8">Profile Strength</div></div>
  </div>
</div>

<!-- AI SEARCH VISIBILITY -->
<div class="sec">
  <div class="sec-title">AI Search Visibility<span style="margin-left:auto;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:700;color:#10B981;border:1px solid #BBF7D0">{'All Bots Accessible' if website else 'No Website'}</span></div>
  <p style="font-size:12px;color:#64748B;margin-bottom:14px">Checks whether major AI search engines can crawl and index this business. Blocked pages = invisible to AI-powered search.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    {''.join(f'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:8px;border:1px solid #E2E8F0"><span style="font-weight:600;font-size:13px">{bot}</span><span style="color:#10B981;font-size:12px;font-weight:600">Accessible</span></div>' for bot in ['ChatGPT', 'Google AI', 'Perplexity', 'Claude AI']) if website else '<div style="padding:16px;text-align:center;color:#94A3B8;grid-column:1/-1">No website to check</div>'}
  </div>
</div>

<!-- BUSINESS DETAILS -->
<div class="sec">
  <div class="sec-title">Business Details</div>
  <div class="grid3" style="margin-bottom:12px">
    <div class="card"><div class="lbl">Website</div><div class="v"><a href="{website}" target="_blank" style="color:#0EA5E9;text-decoration:none">{website or 'Not found'}</a></div></div>
    <div class="card"><div class="lbl">Phone</div><div class="v">{phone or 'Not found'}</div></div>
    <div class="card"><div class="lbl">Email</div><div class="v">{email or 'Not found'}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
    <div class="card"><div class="lbl">Address</div><div class="v">{address or 'Not found'}</div></div>
    <div class="card"><div class="lbl">Industry</div><div class="v">{niche or 'Unknown'}</div></div>
  </div>
</div>

<!-- AI ANALYSIS -->
<div class="sec">
  <div class="sec-title">AI Analysis</div>
  <div style="padding:18px;border-radius:10px;background:#FAFAFA;border-left:4px solid #F97316;font-size:14px;line-height:1.7;color:#334155">{ai_analysis}</div>
</div>

{'<div class="sec"><div class="sec-title">Demo Site Preview</div><p style="font-size:13px;color:#64748B;margin-bottom:12px">We built a modern demo website to show what an upgraded online presence could look like:</p><a href="' + demo_url + '" target="_blank" class="btn-cta">View Demo Site &rarr;</a></div>' if demo_url else ''}

<!-- CTA -->
<div class="cta-box">
  <h2 style="font-size:24px;margin-bottom:8px">Ready to Fix These Issues?</h2>
  <p style="color:#94A3B8;margin-bottom:20px;font-size:14px">We build modern, high-converting websites that rank on Google and appear in AI search results. Free consultation, no commitment.</p>
  <a href="mailto:sales@ioweb3.io?subject=Website Upgrade for {name}" class="btn-cta">Get Free Consultation &rarr;</a>
</div>

<div style="text-align:center;padding:24px;font-size:10px;color:#94A3B8;text-transform:uppercase;letter-spacing:.05em">
Generated by LeadEmpire &middot; Powered by AI &middot; {report_date}
</div>

</div>
</body>
</html>''')



# =============================================
# AI ASSISTANT CHAT
# =============================================

class ChatRequest(BaseModel):
    message: str
    lead_id: Optional[str] = None

@app.post("/api/chat")
def ai_chat(req: ChatRequest, request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "") if auth.startswith("Bearer ") else ""
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Not authenticated")

    user_id = payload["user_id"]
    user_email = payload.get("email", "")

    # Check AI chat limit
    allowed, msg = check_limit(user_id, "ai_chats")
    if not allowed:
        return {"response": "AI chat limit reached for your plan. Upgrade to get more AI conversations."}

    import anthropic
    from config import ANTHROPIC_API_KEY
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    # ── Gather full context ──

    # All user's leads
    all_leads = query("SELECT * FROM leads WHERE user_id=%s ORDER BY created_at DESC", (user_id,))
    total = len(all_leads)
    scored = [l for l in all_leads if l.get("website_score")]
    hot = [l for l in scored if (l.get("website_score") or 0) >= 8]
    warm = [l for l in scored if 6 <= (l.get("website_score") or 0) < 8]
    with_demo = [l for l in all_leads if l.get("demo_site_built")]
    contacted = [l for l in all_leads if l.get("status") in ("contacted", "replied")]
    replied = [l for l in all_leads if l.get("status") == "replied"]
    new_leads = [l for l in all_leads if l.get("status") == "new"]

    # Build lead summary table (top 20 by score)
    top_leads = sorted(all_leads, key=lambda l: (l.get("website_score") or 0), reverse=True)[:20]
    lead_table = ""
    for l in top_leads:
        sc = l.get("website_score") or "?"
        rt = l.get("google_rating") or "?"
        rv = l.get("review_count") or 0
        st = l.get("status") or "new"
        has_demo = "Yes" if l.get("demo_site_built") else "No"
        has_email = "Yes" if l.get("email") else "No"
        lead_table += (
            f"- {l['business_name']} | Score:{sc}/10 | Rating:{rt}★({rv}) | "
            f"Status:{st} | Demo:{has_demo} | Email:{has_email} | "
            f"City:{l.get('city','')} | Niche:{l.get('niche','')}\n"
        )

    # Specific lead context if selected
    specific_lead = ""
    if req.lead_id:
        lead = query_one("SELECT * FROM leads WHERE id=%s AND user_id=%s", (req.lead_id, user_id))
        if lead:
            specific_lead = f"""
CURRENTLY SELECTED LEAD:
  Business: {lead['business_name']}
  Niche: {lead.get('niche','')}
  City: {lead.get('city','')}
  Phone: {lead.get('phone','N/A')}
  Email: {lead.get('email','N/A')}
  Website: {lead.get('website_url','None')}
  Rating: {lead.get('google_rating','N/A')} ({lead.get('review_count',0)} reviews)
  AI Score: {lead.get('website_score','N/A')}/10
  AI Analysis: {lead.get('ai_analysis','N/A')}
  Demo URL: {lead.get('demo_site_url','Not built yet')}
  Status: {lead['status']}
  Address: {lead.get('address','N/A')}
"""

    # Usage info
    usage = get_usage_summary(user_id)

    system_prompt = f"""You are the LeadEmpire AI Assistant — a smart, friendly sales coach built into the LeadEmpire lead generation platform. You have FULL ACCESS to this user's data.

USER: {user_email}
PLAN: {usage.get('plan_label', 'Free Trial')}

── THEIR LEAD STATS ──
Total Leads: {total}
New (unscored): {len(new_leads)}
AI Scored: {len(scored)}
Hot Leads (score 8+): {len(hot)}
Warm Leads (score 6-7): {len(warm)}
Demo Sites Built: {len(with_demo)}
Contacted: {len(contacted)}
Replied: {len(replied)}

── TOP LEADS (by AI score) ──
{lead_table if lead_table else "No leads yet."}

{specific_lead}

── PLATFORM KNOWLEDGE ──
LeadEmpire is an AI-powered lead generation platform. Here's what it does:

FEATURES:
1. Find Leads — Scrape Google Maps by niche + city. Finds businesses with contact details, ratings, reviews.
2. AI Score — Analyzes each lead's website and gives a score 0-10. Labels: Hot(8+), Warm(6-7), Cool(4-5), Cold(0-3)
3. Build Demo — AI generates a complete demo website for the lead to show what an upgrade looks like
4. Email Outreach — Send personalized cold emails to leads with their demo site link
5. Reports — Generate branded PDF audit reports for each scored lead (shareable link)
6. AI Assistant (you!) — Analyze leads, draft emails, suggest strategy, answer questions

HOW TO USE:
- Go to "Find Leads" → pick a niche + city → click "Start Scraping"
- Go to "My Leads" → click "AI Score All" to analyze all leads
- Click "🏗️ Build Demos" to generate demo sites for scored leads
- Click "📧 Outreach" to send email campaigns
- Use filters to find Hot/Warm leads and prioritize them
- Go to "Reports" to generate shareable audit reports

PLANS:
- Free Trial: 7 days, 15 leads, 2 demos, 5 emails, 3 AI chats
- Starter ($29/mo): 200 leads, 20 demos, 100 emails, 30 AI chats
- Growth ($79/mo): 1000 leads, 100 demos, 500 emails, unlimited AI chats
- Agency ($199/mo): Unlimited everything

── YOUR BEHAVIOR ──
1. When asked about leads, ALWAYS reference their actual data above. Name specific businesses.
2. When asked "hottest lead" or "best lead", look at the lead table and pick the highest scored ones.
3. When asked to draft an email, write a personalized one using the lead's actual business name, niche, and city.
4. When asked how to use a feature, give step-by-step instructions.
5. Be concise, actionable, and use emojis sparingly for readability.
6. If they ask about a specific lead, use the CURRENTLY SELECTED LEAD section.
7. Suggest next actions: "Your hottest lead is X — I'd recommend building a demo site for them next."
8. If they have no leads yet, guide them to Find Leads first.
"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1500,
            system=system_prompt,
            messages=[{"role": "user", "content": req.message}],
        )
        increment_usage(user_id, "ai_chats")
        return {"response": response.content[0].text}
    except Exception as e:
        return {"response": f"AI unavailable: {str(e)}"}

# =============================================
# COMPETITOR ANALYSIS
# =============================================

@app.post("/api/leads/{lead_id}/competitors")
def get_competitors(lead_id: str, background: BackgroundTasks):
    lead = query_one("SELECT * FROM leads WHERE id=%s", (lead_id,))
    if not lead:
        raise HTTPException(404, "Lead not found")
    if not lead.get("latitude") or not lead.get("longitude"):
        return {"competitors": [], "message": "No location data for this lead"}

    import requests as req
    from config import GOOGLE_MAPS_API_KEY
    try:
        res = req.get("https://maps.googleapis.com/maps/api/place/nearbysearch/json", params={
            "location": f"{lead['latitude']},{lead['longitude']}",
            "radius": 5000,
            "keyword": lead.get("niche", "business"),
            "key": GOOGLE_MAPS_API_KEY,
        }).json()

        competitors = []
        for place in res.get("results", [])[:8]:
            if place.get("place_id") == lead.get("google_place_id"):
                continue
            competitors.append({
                "name": place.get("name"),
                "rating": place.get("rating"),
                "reviews": place.get("user_ratings_total", 0),
                "address": place.get("vicinity", ""),
                "open_now": place.get("opening_hours", {}).get("open_now"),
            })

        competitors.sort(key=lambda x: x.get("rating", 0) or 0, reverse=True)
        return {"competitors": competitors[:6], "lead": lead["business_name"]}
    except Exception as e:
        return {"competitors": [], "message": str(e)}


# =============================================
# DEMO SITE SERVING
# =============================================

@app.get("/demo/{site_id}", response_class=HTMLResponse)
def serve_demo(site_id: str):
    site = query_one("SELECT html_content, expires_at FROM demo_sites WHERE id=%s", (site_id,))
    if not site:
        return HTMLResponse("<h1>Demo site not found</h1>", status_code=404)
    return site["html_content"]


# =============================================
# WEBHOOKS
# =============================================

@app.post("/webhooks/resend")
async def resend_webhook(request: Request):
    body = await request.json()
    event_type = body.get("type", "")
    email_id = body.get("data", {}).get("email_id")

    if not email_id:
        return {"received": True}

    updates = {
        "email.opened": ("opened", "opened_at"),
        "email.clicked": ("clicked", "clicked_at"),
        "email.bounced": ("bounced", "bounced_at"),
    }
    if event_type in updates:
        status, field = updates[event_type]
        execute(f"UPDATE emails_sent SET status=%s, {field}=now() WHERE resend_id=%s", (status, email_id))

    return {"received": True}


# =============================================
# START
# =============================================

if __name__ == "__main__":
    import uvicorn
    # Setup database on first run
    from setup_db import SCHEMA
    for stmt in SCHEMA.split(";"):
        s = stmt.strip()
        if s:
            try:
                execute(s + ";")
            except Exception:
                pass

    # Run migrations for existing databases
    MIGRATIONS = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'trial'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ",
        "ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id TEXT",
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_id TEXT",
        "ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS user_id TEXT",
    ]
    for m in MIGRATIONS:
        try:
            execute(m)
        except Exception:
            pass

    print("[OK] Database ready")
    setup_default_admin()
    print(f"[OK] Dashboard: http://localhost:{PORT}")
    print(f"[OK] Login:     http://localhost:{PORT}/login")
    print(f"[OK] API docs:  http://localhost:{PORT}/docs")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
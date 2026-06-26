import time
import json
import re
import requests
from bs4 import BeautifulSoup
import anthropic
from config import ANTHROPIC_API_KEY, query, execute

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def parse_claude_json(raw: str) -> dict:
    """Safely parse JSON from Claude, stripping markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return json.loads(text)


def extract_emails(html: str, url: str) -> list:
    """Extract real email addresses from HTML content."""
    if not html:
        return []
    # Find emails in HTML (mailto links + text patterns)
    pattern = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    found = set(re.findall(pattern, html))
    # Filter out common fake/placeholder emails
    blocked = ['example.com', 'yourdomain', 'email.com', 'domain.com', 'test.com',
               'sentry.io', 'wixpress.com', 'w3.org', 'schema.org', 'googleapis.com']
    return [e for e in found if not any(b in e.lower() for b in blocked)][:5]


def fetch_website(url: str) -> dict:
    """Fetch and analyze a business website."""
    try:
        res = requests.get(url, timeout=10, headers={
            "User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)"
        }, allow_redirects=True)

        soup = BeautifulSoup(res.text, "html.parser")
        raw_html = res.text  # Keep raw for email extraction

        for tag in soup(["script", "style", "noscript", "iframe"]):
            tag.decompose()

        # Extract emails from the page
        emails = extract_emails(raw_html, url)

        return {
            "html": str(soup)[:3000],
            "title": soup.title.string.strip() if soup.title and soup.title.string else "",
            "has_https": url.startswith("https"),
            "has_mobile": bool(soup.find("meta", attrs={"name": "viewport"})),
            "emails": emails,
            "error": None,
        }
    except Exception as e:
        return {"html": None, "emails": [], "error": str(e)}


def qualify_single(lead: dict) -> dict:
    """Score a single lead with Claude. Returns {score, qualified, summary}."""
    print(f"  Qualifying: {lead['business_name']}")

    # No website = high score (great prospect — they need one!)
    if not lead.get("website_url"):
        execute("""
            UPDATE leads SET website_score=10, ai_analysis='No website found. Strong candidate for a new website.',
            qualification='qualified', status='qualified', updated_at=now()
            WHERE id=%s
        """, (lead["id"],))
        log_activity("qualify", lead.get("campaign_id"), lead["id"],
                     f"Auto-qualified (no website): {lead['business_name']}", {"score": 10})
        print(f"    → 10/10 (no website)")
        return {"score": 10, "qualified": True}

    # Fetch website
    site = fetch_website(lead["website_url"])

    # Site actually unreachable (timeout, DNS fail, etc.)
    if site["error"]:
        execute("""
            UPDATE leads SET website_score=7, ai_analysis=%s,
            qualification='qualified', status='qualified', updated_at=now()
            WHERE id=%s
        """, (f"Website unreachable: {site['error'][:100]}. May need a new site or hosting fix.", lead["id"]))
        log_activity("qualify", lead.get("campaign_id"), lead["id"],
                     f"Qualified (site unreachable): {lead['business_name']}", {"score": 7})
        print(f"    → 7/10 (site unreachable)")
        return {"score": 7, "qualified": True}

    # Save any extracted emails to the lead if it doesn't have one
    extracted_emails = site.get("emails", [])
    if extracted_emails and not lead.get("email"):
        execute("UPDATE leads SET email=%s WHERE id=%s", (extracted_emails[0], lead["id"]))
        print(f"    → Found email: {extracted_emails[0]}")

    # Ask Claude to evaluate the website
    prompt = f"""You are a web design agency evaluating a local business website to decide if they need your help.

CRITICAL SCORING RULE: High score = BAD website = HOT prospect for you. Low score = GOOD website = COLD prospect.

Business: {lead['business_name']}
Listed Niche: {lead.get('niche', 'unknown')}
City: {lead.get('city', '')}
Website: {lead['website_url']}
Google Rating: {lead.get('google_rating', 'N/A')} ({lead.get('review_count', 0)} reviews)
Has HTTPS: {site.get('has_https', False)}
Has Mobile Viewport: {site.get('has_mobile', False)}
Page Title: {site.get('title', 'None')}

Website HTML (first 3000 chars):
<website>
{site['html']}
</website>

SCORING (be strict and accurate):
1-2 = EXCELLENT site. Modern, responsive, professional, fast, has SSL, clear CTAs. They do NOT need help.
3-4 = GOOD site. Functional, decent design, minor improvements possible. Low priority prospect.
5-6 = MEDIOCRE. Outdated design, missing features, not mobile-friendly. Decent prospect.
7-8 = POOR. Ugly, broken links, very outdated, missing key info, bad UX. Good prospect.
9 = TERRIBLE. Barely works, looks abandoned or amateur. Great prospect.
10 = NO website at all.

WARNING: If you see a modern React/Next.js/WordPress site with good design, navigation, images, and content — that is a 1-3 score. Do NOT give high scores to good websites. Be honest.

Also detect the ACTUAL business type from the website content. If the website clearly belongs to a different type of business than "{lead.get('niche', 'unknown')}", include the correct type.

Return ONLY valid JSON:
{{"score": <1-10>, "actual_niche": "<the real business type based on website content>", "issues": ["issue1", "issue2", "issue3"], "summary": "<one sentence explaining the score>", "qualified": true}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        result = parse_claude_json(response.content[0].text)

        score = result.get("score", 5)
        qualified = result.get("qualified", score >= 6)
        summary = result.get("summary", "Analysis complete.")

        status = "qualified" if qualified else "archived"
        qual = "qualified" if qualified else "rejected"

        execute("""
            UPDATE leads SET website_score=%s, ai_analysis=%s,
            qualification=%s, status=%s, updated_at=now()
            WHERE id=%s
        """, (score, summary, qual, status, lead["id"]))

        # Update niche if Claude detected a different actual business type
        actual_niche = result.get("actual_niche", "").strip()
        if actual_niche and actual_niche.lower() != (lead.get("niche") or "").lower():
            execute("UPDATE leads SET niche=%s WHERE id=%s", (actual_niche, lead["id"]))
            print(f"    → Niche corrected: {lead.get('niche')} → {actual_niche}")

            # If actual niche is completely different from campaign niche, mark as wrong match
            campaign_niche = (lead.get("niche") or "").lower()
            actual_lower = actual_niche.lower()
            # Check if there's any overlap in keywords
            campaign_words = set(campaign_niche.replace(",", " ").split())
            actual_words = set(actual_lower.replace(",", " ").replace("/", " ").split())
            overlap = campaign_words & actual_words
            if not overlap and len(campaign_niche) > 2:
                execute("""
                    UPDATE leads SET qualification='rejected', status='archived',
                    ai_analysis=%s, website_score=%s WHERE id=%s
                """, (f"Wrong niche — listed as {campaign_niche} but actually {actual_niche}. Auto-rejected.",
                      min(score, 2), lead["id"]))
                print(f"    → Auto-rejected: wrong niche ({campaign_niche} vs {actual_niche})")

        print(f"    → {score}/10 ({summary})")

        log_activity("qualify", lead.get("campaign_id"), lead["id"],
                     f"{'Qualified' if qualified else 'Rejected'} ({score}/10): {lead['business_name']}",
                     {"score": score, "issues": result.get("issues", [])})
        return result

    except Exception as e:
        print(f"    Error: {e}")
        return {"score": 0, "qualified": False, "error": str(e)}


def qualify_new_leads(limit: int = 4) -> dict:
    """Process unqualified leads. Returns {qualified, rejected}."""
    leads = query("SELECT * FROM leads WHERE qualification='pending' ORDER BY created_at LIMIT %s", (limit,))
    print(f"[Qualifier] Processing {len(leads)} leads")

    qualified = 0
    rejected = 0

    for lead in leads:
        result = qualify_single(lead)
        if result.get("qualified"):
            qualified += 1
        else:
            rejected += 1
        time.sleep(15)

    print(f"[Qualifier] Done — Qualified: {qualified}, Rejected: {rejected}")
    return {"qualified": qualified, "rejected": rejected}


def log_activity(type_, campaign_id, lead_id, message, metadata=None):
    execute("""
        INSERT INTO activity_log (type, campaign_id, lead_id, message, metadata)
        VALUES (%s, %s, %s, %s, %s)
    """, (type_, campaign_id, lead_id, message, json.dumps(metadata or {})))
"""
LeadEmpire — Multi-Theme Demo Site Templates
6 unique designs auto-matched to business type.
"""
from html import escape as esc
import hashlib


# ── Niche → Theme mapping ──
NICHE_THEME = {
    "dentists": "medical", "dental": "medical", "hospital": "medical",
    "clinic": "medical", "vets": "medical", "veterinary": "medical",
    "doctor": "medical", "medical": "medical", "healthcare": "medical",

    "restaurants": "warm", "cafe": "warm", "restaurant": "warm",
    "dining": "warm", "hotel": "warm", "bakery": "warm", "food": "warm",

    "gyms": "bold", "fitness": "bold", "gym": "bold", "it_services": "bold",
    "tech": "bold", "digital_marketing": "bold", "web_dev": "bold",
    "software": "bold",

    "lawyers": "luxe", "law": "luxe", "accounting": "luxe",
    "consulting": "luxe", "finance": "luxe", "insurance": "luxe",

    "salons": "creative", "salon": "creative", "photography": "creative",
    "education": "creative", "coaching": "creative", "beauty": "creative",
    "spa": "creative",

    "realestate": "classic", "real estate": "classic", "construction": "classic",
    "plumbers": "classic", "plumber": "classic", "auto": "classic",
    "cleaning": "classic", "contractor": "classic",
}


def pick_theme(lead):
    """Pick the best theme for this business."""
    niche = (lead.get("niche") or "").lower()
    for key, theme in NICHE_THEME.items():
        if key in niche:
            return theme
    # Fallback: hash the business name to get a consistent but varied theme
    themes = ["medical", "warm", "bold", "luxe", "creative", "classic"]
    h = int(hashlib.md5((lead.get("business_name") or "biz").encode()).hexdigest(), 16)
    return themes[h % len(themes)]


# ══════════════════════════════════════════
# THEME CONFIGS
# ══════════════════════════════════════════

THEMES = {
    "medical": {
        "name": "Medical Clean",
        "primary": "#0891B2", "primary_dark": "#0E7490",
        "accent": "#06B6D4", "bg": "#F0FDFA", "hero_bg": "#0F172A",
        "hero_text": "#FFFFFF", "card_bg": "#FFFFFF",
        "heading_font": "'Inter', sans-serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "split",  # split layout with image placeholder
        "radius": "12px",
    },
    "warm": {
        "name": "Warm Organic",
        "primary": "#D97706", "primary_dark": "#B45309",
        "accent": "#F59E0B", "bg": "#FFFBF5", "hero_bg": "#1C1917",
        "hero_text": "#FFFFFF", "card_bg": "#FFFFFF",
        "heading_font": "'Georgia', serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "centered",
        "radius": "20px",
    },
    "bold": {
        "name": "Bold Dark",
        "primary": "#8B5CF6", "primary_dark": "#7C3AED",
        "accent": "#A78BFA", "bg": "#0F0F0F", "hero_bg": "#0F0F0F",
        "hero_text": "#FFFFFF", "card_bg": "#1A1A2E",
        "heading_font": "'Inter', sans-serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "bold",
        "radius": "16px",
    },
    "luxe": {
        "name": "Minimal Luxe",
        "primary": "#1E293B", "primary_dark": "#0F172A",
        "accent": "#64748B", "bg": "#FAFAF9", "hero_bg": "#FAFAF9",
        "hero_text": "#0F172A", "card_bg": "#FFFFFF",
        "heading_font": "'Georgia', serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "minimal",
        "radius": "4px",
    },
    "creative": {
        "name": "Vibrant Creative",
        "primary": "#EC4899", "primary_dark": "#DB2777",
        "accent": "#F472B6", "bg": "#FFFFFF", "hero_bg": "linear-gradient(135deg, #EC4899, #8B5CF6)",
        "hero_text": "#FFFFFF", "card_bg": "#FFFFFF",
        "heading_font": "'Inter', sans-serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "gradient",
        "radius": "24px",
    },
    "classic": {
        "name": "Classic Professional",
        "primary": "#1E40AF", "primary_dark": "#1E3A8A",
        "accent": "#D97706", "bg": "#F8FAFC", "hero_bg": "#1E3A5F",
        "hero_text": "#FFFFFF", "card_bg": "#FFFFFF",
        "heading_font": "'Inter', sans-serif",
        "body_font": "'Inter', sans-serif",
        "hero_style": "angled",
        "radius": "8px",
    },
}


def build_site_html(lead, content):
    """Build a complete demo website. Picks theme based on niche."""
    theme_key = pick_theme(lead)
    t = THEMES[theme_key]

    name = esc(lead.get("business_name") or "Business")
    niche = esc(lead.get("niche") or "Local Business")
    city = esc(lead.get("city") or "")
    phone = esc(lead.get("phone") or "")
    address = esc(lead.get("address") or "")
    email = esc(lead.get("email") or "")
    rating = lead.get("google_rating") or 0
    reviews = lead.get("review_count") or 0
    website = lead.get("website_url") or ""

    tagline = esc(content.get("tagline", "Your Trusted Local Business"))
    about = esc(content.get("about", "We are dedicated to providing the best service to our community."))
    services = content.get("services", [])
    cta_text = esc(content.get("cta_text", "Get in Touch"))
    review_list = content.get("reviews", [])

    # Star HTML
    stars = ""
    if rating:
        for i in range(1, 6):
            stars += f'<span style="color:#F59E0B;font-size:20px">{"★" if i <= int(rating) else "☆"}</span>'
        stars += f' <span style="font-weight:700;color:#F59E0B">{rating}</span>'
        if reviews:
            stars += f' <span style="color:#94A3B8;font-size:13px">({reviews} reviews)</span>'

    # Services HTML
    svc_html = ""
    icons = ["✦", "◆", "●", "▲", "★", "◉", "⬡", "❖"]
    for i, s in enumerate(services[:6]):
        sn = esc(s.get("name", "Service"))
        sd = esc(s.get("desc", ""))
        icon = icons[i % len(icons)]
        if theme_key == "bold":
            svc_html += f'''<div style="background:{t['card_bg']};border:1px solid #2A2A3E;border-radius:{t['radius']};padding:28px 24px">
                <div style="font-size:28px;margin-bottom:12px;color:{t['primary']}">{icon}</div>
                <h3 style="font-size:16px;font-weight:700;color:#FFFFFF;margin-bottom:8px">{sn}</h3>
                <p style="font-size:13px;color:#94A3B8;line-height:1.6">{sd}</p>
            </div>'''
        elif theme_key == "luxe":
            svc_html += f'''<div style="border-bottom:1px solid #E2E8F0;padding:24px 0;display:flex;gap:20px;align-items:flex-start">
                <span style="font-size:11px;color:{t['accent']};font-weight:600;min-width:24px">{str(i+1).zfill(2)}</span>
                <div><h3 style="font-size:15px;font-weight:600;color:#0F172A;margin-bottom:4px;font-family:{t['heading_font']}">{sn}</h3>
                <p style="font-size:13px;color:#64748B;line-height:1.6">{sd}</p></div>
            </div>'''
        elif theme_key == "creative":
            colors = ["#EC4899", "#8B5CF6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444"]
            c = colors[i % len(colors)]
            svc_html += f'''<div style="background:#FFFFFF;border-radius:{t['radius']};padding:28px 24px;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid #F1F5F9;text-align:center">
                <div style="width:48px;height:48px;border-radius:14px;background:{c}15;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:20px;color:{c}">{icon}</div>
                <h3 style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:6px">{sn}</h3>
                <p style="font-size:13px;color:#64748B;line-height:1.6">{sd}</p>
            </div>'''
        else:
            svc_html += f'''<div style="background:{t['card_bg']};border-radius:{t['radius']};padding:28px 24px;box-shadow:0 2px 12px rgba(0,0,0,.04);border:1px solid #E2E8F0">
                <div style="width:40px;height:40px;border-radius:10px;background:{t['primary']}15;display:flex;align-items:center;justify-content:center;margin-bottom:14px;font-size:18px;color:{t['primary']}">{icon}</div>
                <h3 style="font-size:15px;font-weight:700;color:#0F172A;margin-bottom:6px;font-family:{t['heading_font']}">{sn}</h3>
                <p style="font-size:13px;color:#64748B;line-height:1.6">{sd}</p>
            </div>'''

    # Reviews HTML
    rev_html = ""
    for r in review_list[:3]:
        rn = esc(r.get("name", "Customer"))
        rt = esc(r.get("text", "Great service!"))
        rs = int(r.get("stars", 5))
        rstars = "★" * rs + "☆" * (5 - rs)
        if theme_key == "bold":
            rev_html += f'''<div style="background:#1A1A2E;border:1px solid #2A2A3E;border-radius:{t['radius']};padding:24px">
                <div style="color:#F59E0B;margin-bottom:8px">{rstars}</div>
                <p style="font-size:13px;color:#CBD5E1;line-height:1.6;margin-bottom:12px;font-style:italic">"{rt}"</p>
                <div style="font-size:12px;font-weight:600;color:#FFFFFF">— {rn}</div>
            </div>'''
        else:
            rev_html += f'''<div style="background:{t['card_bg']};border-radius:{t['radius']};padding:24px;box-shadow:0 2px 12px rgba(0,0,0,.04);border:1px solid #E2E8F0">
                <div style="color:#F59E0B;margin-bottom:8px">{rstars}</div>
                <p style="font-size:13px;color:#475569;line-height:1.6;margin-bottom:12px;font-style:italic">"{rt}"</p>
                <div style="font-size:12px;font-weight:600;color:#0F172A">— {rn}</div>
            </div>'''

    # ── Hero section varies by theme ──
    if theme_key == "bold":
        hero = f'''<section style="background:#0F0F0F;padding:100px 24px 80px;text-align:center;position:relative;overflow:hidden">
            <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,{t['primary']}20,transparent);pointer-events:none"></div>
            <div style="position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,{t['accent']}15,transparent);pointer-events:none"></div>
            <div style="max-width:700px;margin:0 auto;position:relative;z-index:1">
                <div style="display:inline-block;padding:6px 16px;border-radius:20px;border:1px solid #2A2A3E;font-size:12px;color:{t['accent']};margin-bottom:24px">{niche} in {city}</div>
                <h1 style="font-size:48px;font-weight:800;color:#FFFFFF;margin-bottom:16px;line-height:1.1;letter-spacing:-.03em">{name}</h1>
                <p style="font-size:18px;color:#94A3B8;margin-bottom:32px">{tagline}</p>
                <a href="tel:{phone}" style="display:inline-block;padding:16px 40px;border-radius:12px;background:linear-gradient(135deg,{t['primary']},{t['primary_dark']});color:#fff;font-weight:700;text-decoration:none;font-size:15px">{cta_text}</a>
            </div>
        </section>'''
    elif theme_key == "luxe":
        hero = f'''<section style="background:{t['hero_bg']};padding:120px 24px 80px;border-bottom:1px solid #E2E8F0">
            <div style="max-width:800px;margin:0 auto">
                <p style="font-size:12px;text-transform:uppercase;letter-spacing:.15em;color:{t['accent']};margin-bottom:20px;font-weight:500">{niche} · {city}</p>
                <h1 style="font-size:52px;font-weight:400;color:#0F172A;margin-bottom:20px;line-height:1.15;font-family:{t['heading_font']}">{name}</h1>
                <p style="font-size:18px;color:#64748B;margin-bottom:40px;max-width:500px;line-height:1.7">{tagline}</p>
                <div style="display:flex;gap:16px;align-items:center">
                    <a href="tel:{phone}" style="display:inline-block;padding:14px 32px;background:#0F172A;color:#fff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.02em">{cta_text}</a>
                    {f'<div>{stars}</div>' if stars else ''}
                </div>
            </div>
        </section>'''
    elif theme_key == "creative":
        hero = f'''<section style="background:linear-gradient(135deg,#EC4899,#8B5CF6,#06B6D4);padding:100px 24px 80px;text-align:center;position:relative">
            <div style="max-width:700px;margin:0 auto;position:relative;z-index:1">
                <h1 style="font-size:50px;font-weight:800;color:#FFFFFF;margin-bottom:16px;line-height:1.1">{name}</h1>
                <p style="font-size:18px;color:rgba(255,255,255,.85);margin-bottom:12px">{tagline}</p>
                {f'<div style="margin-bottom:24px">{stars}</div>' if stars else ''}
                <a href="tel:{phone}" style="display:inline-block;padding:16px 40px;border-radius:50px;background:#FFFFFF;color:#8B5CF6;font-weight:700;text-decoration:none;font-size:15px;box-shadow:0 8px 32px rgba(0,0,0,.15)">{cta_text}</a>
            </div>
        </section>'''
    elif theme_key == "classic":
        hero = f'''<section style="background:{t['hero_bg']};padding:100px 24px 80px;position:relative;overflow:hidden">
            <div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:{t['bg']};clip-path:polygon(0 100%,100% 100%,100% 0,0 100%)"></div>
            <div style="max-width:700px;margin:0 auto;position:relative;z-index:1">
                <h1 style="font-size:44px;font-weight:800;color:#FFFFFF;margin-bottom:12px;line-height:1.15">{name}</h1>
                <p style="font-size:17px;color:rgba(255,255,255,.8);margin-bottom:8px">{tagline}</p>
                {f'<div style="margin-bottom:24px">{stars}</div>' if stars else ''}
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    <a href="tel:{phone}" style="display:inline-block;padding:14px 32px;border-radius:{t['radius']};background:{t['accent']};color:#fff;font-weight:700;text-decoration:none">{cta_text}</a>
                    <a href="mailto:{email}" style="display:inline-block;padding:14px 32px;border-radius:{t['radius']};border:2px solid rgba(255,255,255,.3);color:#fff;font-weight:600;text-decoration:none">Email Us</a>
                </div>
            </div>
        </section>'''
    elif theme_key == "warm":
        hero = f'''<section style="background:{t['hero_bg']};padding:100px 24px 80px;text-align:center">
            <div style="max-width:700px;margin:0 auto">
                <p style="font-size:13px;color:{t['accent']};margin-bottom:16px;letter-spacing:.05em;text-transform:uppercase">{niche} in {city}</p>
                <h1 style="font-size:48px;font-weight:400;color:#FFFFFF;margin-bottom:16px;line-height:1.15;font-family:{t['heading_font']}">{name}</h1>
                <p style="font-size:17px;color:#A8A29E;margin-bottom:12px">{tagline}</p>
                {f'<div style="margin-bottom:28px">{stars}</div>' if stars else ''}
                <a href="tel:{phone}" style="display:inline-block;padding:16px 40px;border-radius:50px;background:linear-gradient(135deg,{t['primary']},{t['primary_dark']});color:#fff;font-weight:700;text-decoration:none;font-size:15px">{cta_text}</a>
            </div>
        </section>'''
    else:  # medical
        hero = f'''<section style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:100px 24px 80px">
            <div style="max-width:900px;margin:0 auto;display:flex;align-items:center;gap:48px;flex-wrap:wrap">
                <div style="flex:1;min-width:280px">
                    <div style="display:inline-block;padding:4px 14px;border-radius:20px;background:{t['primary']}20;font-size:12px;color:{t['accent']};margin-bottom:20px;border:1px solid {t['primary']}30">{niche}</div>
                    <h1 style="font-size:40px;font-weight:800;color:#FFFFFF;margin-bottom:14px;line-height:1.15">{name}</h1>
                    <p style="font-size:16px;color:#94A3B8;margin-bottom:24px;line-height:1.7">{tagline}</p>
                    <a href="tel:{phone}" style="display:inline-block;padding:14px 32px;border-radius:{t['radius']};background:{t['primary']};color:#fff;font-weight:700;text-decoration:none">{cta_text}</a>
                </div>
                <div style="flex:0 0 280px;background:{t['primary']}15;border-radius:20px;padding:32px;text-align:center;border:1px solid {t['primary']}20">
                    {f'<div style="margin-bottom:12px">{stars}</div>' if stars else ''}
                    <div style="font-size:14px;color:#94A3B8">{city}</div>
                    {f'<div style="font-size:13px;color:{t["accent"]};margin-top:8px">{phone}</div>' if phone else ''}
                </div>
            </div>
        </section>'''

    # ── Assemble full page ──
    text_color = "#FFFFFF" if theme_key == "bold" else "#0F172A"
    sub_color = "#94A3B8" if theme_key == "bold" else "#64748B"
    section_bg = t["bg"]

    svc_grid = "repeat(auto-fill, minmax(280px, 1fr))" if theme_key != "luxe" else "1fr"
    svc_gap = "20px" if theme_key != "luxe" else "0"

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{name} — {niche} in {city}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Georgia&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:{t['body_font']};background:{section_bg};color:{text_color}}}
a{{transition:opacity .2s}}a:hover{{opacity:.85}}
.container{{max-width:1000px;margin:0 auto;padding:0 24px}}
section{{padding:72px 24px}}
h2{{font-family:{t['heading_font']};font-size:28px;font-weight:700;margin-bottom:12px}}
</style>
</head>
<body>

{hero}

<!-- About -->
<section style="background:{section_bg}">
<div class="container" style="max-width:700px;text-align:{'center' if theme_key in ['warm','creative','medical'] else 'left'}">
    <h2 style="color:{text_color}">About {name}</h2>
    <p style="font-size:15px;color:{sub_color};line-height:1.8;margin-top:12px">{about}</p>
</div>
</section>

<!-- Services -->
<section style="background:{'#0A0A0A' if theme_key == 'bold' else '#FFFFFF' if theme_key == 'luxe' else section_bg}">
<div class="container">
    <h2 style="text-align:center;color:{text_color};margin-bottom:32px">{'What We Offer' if theme_key == 'bold' else 'Our Services'}</h2>
    <div style="display:grid;grid-template-columns:{svc_grid};gap:{svc_gap}">
        {svc_html}
    </div>
</div>
</section>

<!-- Reviews -->
{'<section style="background:' + ('#0F0F0F' if theme_key == 'bold' else section_bg) + '"><div class="container"><h2 style="text-align:center;color:' + text_color + ';margin-bottom:32px">What Our Clients Say</h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">' + rev_html + '</div></div></section>' if rev_html else ''}

<!-- Contact / CTA -->
<section style="background:{t['primary']};text-align:center;padding:64px 24px">
<div class="container">
    <h2 style="color:#FFFFFF;font-size:28px;margin-bottom:12px">Ready to Get Started?</h2>
    <p style="color:rgba(255,255,255,.8);margin-bottom:28px;font-size:15px">Contact us today for a free consultation</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
        {f'<a href="tel:{phone}" style="padding:14px 32px;border-radius:{t["radius"]};background:#FFFFFF;color:{t["primary"]};font-weight:700;text-decoration:none;font-size:14px">Call {phone}</a>' if phone else ''}
        {f'<a href="mailto:{email}" style="padding:14px 32px;border-radius:{t["radius"]};border:2px solid rgba(255,255,255,.4);color:#FFFFFF;font-weight:600;text-decoration:none;font-size:14px">Email Us</a>' if email else ''}
    </div>
</div>
</section>

<!-- Footer -->
<footer style="background:{'#0A0A0A' if theme_key == 'bold' else '#0F172A'};color:#94A3B8;text-align:center;padding:32px 24px;font-size:12px">
    <p>{name} · {address}</p>
    <p style="margin-top:8px;color:#475569">Demo site by <a href="https://leadhouse.io" style="color:{t['accent']};text-decoration:none">LeadEmpire</a></p>
</footer>

</body>
</html>'''
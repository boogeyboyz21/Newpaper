import os
from datetime import datetime, timezone, timedelta
from database import db
from auth_utils import hash_password, verify_password

IMG = {
    "global": [
        "https://images.unsplash.com/photo-1758138258458-64ee0fbdef4c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    ],
    "business": [
        "https://images.unsplash.com/photo-1686100511314-7d4a52987f2f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1554260570-9140fd3b7614?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    ],
    "tech": [
        "https://images.pexels.com/photos/18471461/pexels-photo-18471461.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    ],
    "lifestyle": [
        "https://images.pexels.com/photos/4901939/pexels-photo-4901939.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    ],
    "sports": [
        "https://images.pexels.com/photos/29666576/pexels-photo-29666576.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
    ],
}

PARA = [
    "In a development that has drawn international attention, officials confirmed the details late on Tuesday, marking a significant shift in the ongoing situation.",
    "Analysts say the implications could reshape the landscape for years to come, with stakeholders across sectors weighing in on the potential consequences and opportunities that lie ahead.",
    "\"This is a defining moment,\" said one senior observer, noting that the coming weeks would be critical in determining the trajectory of events on the ground.",
    "The response from the public has been swift and varied, reflecting the complex and often competing interests at play in a story that continues to unfold.",
    "As the situation evolves, our correspondents will continue to provide comprehensive coverage and in-depth analysis from the field.",
]

ARTICLES = [
    ("global", "Historic Summit Concludes With Landmark Climate Accord", "World leaders reach consensus after marathon negotiations", True, True),
    ("global", "Coalition Talks Enter Decisive Phase Amid Political Uncertainty", "Party leaders race to form a government before deadline", False, True),
    ("global", "Diplomatic Breakthrough Eases Months of Regional Tension", "New framework agreement signed in neutral capital", False, False),
    ("global", "Millions Head to Polls in Landmark National Election", "Record turnout expected as campaigns enter final hours", False, False),
    ("business", "Central Bank Holds Rates Steady as Inflation Cools", "Markets rally on signals of a measured policy path", True, True),
    ("business", "Tech Giant Posts Record Quarterly Earnings", "Revenue beats expectations on strong services growth", False, False),
    ("business", "Manufacturing Sector Shows Signs of Steady Recovery", "New orders climb for third consecutive month", False, False),
    ("business", "Startup Funding Rebounds as Investor Confidence Returns", "Late-stage rounds lead a broad market revival", False, False),
    ("tech", "Breakthrough in Fusion Research Sparks New Optimism", "Scientists report a sustained net energy gain", True, True),
    ("tech", "New Space Telescope Reveals Distant Galaxies in Stunning Detail", "Images offer a glimpse into the early universe", False, False),
    ("tech", "Researchers Unveil Battery That Charges in Minutes", "Solid-state design promises longer life and safety", False, False),
    ("tech", "AI Model Aids Early Detection of Rare Diseases", "Clinical trials show promising diagnostic accuracy", False, False),
    ("lifestyle", "A Culinary Renaissance Sweeps the Coastal Towns", "Chefs reinvent tradition with local, seasonal produce", True, False),
    ("lifestyle", "The Slow Travel Movement Redefines the Modern Holiday", "Travelers trade checklists for meaningful journeys", False, False),
    ("lifestyle", "Inside the Revival of Handcrafted Design", "Artisans blend heritage techniques with modern taste", False, False),
    ("sports", "Underdogs Stun Champions in Thrilling Final", "A last-minute goal seals a historic upset victory", True, True),
    ("sports", "Veteran Star Announces Farewell Season", "Fans celebrate a career defined by resilience", False, False),
    ("sports", "Young Talent Shatters Long-Standing National Record", "A new era dawns for the national squad", False, False),
]


async def seed():
    # ---- Users ----
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").lower()
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    accounts = [
        (admin_email, admin_pw, "Site Owner", "administrator"),
        ("editor@editorialwire.com", "Editor@123", "Elena Editor", "editor"),
        ("reporter@editorialwire.com", "Reporter@123", "Ravi Reporter", "reporter"),
        ("reader@editorialwire.com", "Reader@123", "Sam Reader", "subscriber"),
    ]
    for email, pw, name, role in accounts:
        existing = await db.users.find_one({"email": email})
        if not existing:
            await db.users.insert_one({"name": name, "email": email, "password_hash": hash_password(pw),
                                       "role": role, "subscription": None,
                                       "created_at": datetime.now(timezone.utc).isoformat()})
        elif not verify_password(pw, existing["password_hash"]):
            await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(pw), "role": role}})

    reporter = await db.users.find_one({"email": "reporter@editorialwire.com"})

    # ---- Articles ----
    if await db.articles.count_documents({}) == 0:
        base = datetime.now(timezone.utc)
        counters = {k: 0 for k in IMG}
        for i, (cat, title, subtitle, is_lead, is_breaking) in enumerate(ARTICLES):
            idx = counters[cat] % len(IMG[cat])
            counters[cat] += 1
            pub = (base - timedelta(hours=i * 5)).isoformat()
            await db.articles.insert_one({
                "title": title, "subtitle": subtitle, "category": cat,
                "excerpt": PARA[0], "body": PARA, "image_url": IMG[cat][idx],
                "author_id": str(reporter["_id"]), "author_name": reporter["name"],
                "tags": [cat, "news"], "status": "published",
                "is_lead": is_lead, "is_breaking": is_breaking,
                "is_premium": True, "views": (len(ARTICLES) - i) * 37 + 10,
                "created_at": pub, "updated_at": pub, "published_at": pub,
            })

    # ---- Indexes ----
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.articles.create_index([("category", 1), ("status", 1)])
    await db.comments.create_index([("article_id", 1), ("status", 1)])

    # ---- Credentials file ----
    creds = f"""# Test Credentials

## Admin / Owner (Administrator)
- Email: {admin_email}
- Password: {admin_pw}

## Editor
- Email: editor@editorialwire.com
- Password: Editor@123

## Reporter
- Email: reporter@editorialwire.com
- Password: Reporter@123

## Subscriber (regular reader)
- Email: reader@editorialwire.com
- Password: Reader@123

## Auth endpoints
- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET  /api/auth/me
"""
    try:
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(creds)
    except Exception:
        pass

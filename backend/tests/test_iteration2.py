"""Backend tests for iteration_2 new features: CMS pages, Contact, Ad plans/purchase/moderate/serve, Authors, Premium articles."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "boogeyboyz21@gmail.com", "password": "Admin@12345"}
EDITOR = {"email": "editor@editorialwire.com", "password": "Editor@123"}
REPORTER = {"email": "reporter@editorialwire.com", "password": "Reporter@123"}
READER = {"email": "reader@editorialwire.com", "password": "Reader@123"}


def _login_session(creds):
    sess = requests.Session()
    r = sess.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login {creds['email']}: {r.text}"
    tok = r.json()["token"]
    sess.headers.update({"Authorization": f"Bearer {tok}"})
    sess.user = r.json()["user"]
    return sess


@pytest.fixture(scope="module")
def admin_sess(): return _login_session(ADMIN)


@pytest.fixture(scope="module")
def reader_sess(): return _login_session(READER)


@pytest.fixture(scope="module")
def reporter_sess(): return _login_session(REPORTER)


@pytest.fixture(scope="module")
def editor_sess(): return _login_session(EDITOR)


# ---------------- CMS Pages ----------------
class TestCMSPages:
    def test_get_faq(self):
        r = requests.get(f"{API}/pages/faq")
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == "faq" and d["title"] and d["body"]

    def test_get_privacy(self):
        r = requests.get(f"{API}/pages/privacy")
        assert r.status_code == 200 and "Privacy" in r.json()["title"]

    def test_get_terms(self):
        r = requests.get(f"{API}/pages/terms")
        assert r.status_code == 200 and "Terms" in r.json()["title"]

    def test_get_unknown_404(self):
        r = requests.get(f"{API}/pages/nonexistent-slug-xyz")
        assert r.status_code == 404

    def test_admin_list_pages(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/pages")
        assert r.status_code == 200
        slugs = [p["slug"] for p in r.json()]
        assert "faq" in slugs and "privacy" in slugs and "terms" in slugs

    def test_admin_update_page_persists(self, admin_sess):
        new_body = f"<p>TEST FAQ body {uuid.uuid4().hex[:6]}</p>"
        r = admin_sess.put(f"{API}/admin/pages/faq",
                           json={"title": "Frequently Asked Questions", "body": new_body})
        assert r.status_code == 200 and r.json()["ok"] is True
        # verify persisted
        g = requests.get(f"{API}/pages/faq")
        assert g.status_code == 200
        assert g.json()["body"] == new_body
        # restore
        admin_sess.put(f"{API}/admin/pages/faq",
                       json={"title": "Frequently Asked Questions",
                             "body": "<p>Restored</p>"})

    def test_reader_cannot_edit_page(self, reader_sess):
        r = reader_sess.put(f"{API}/admin/pages/faq",
                            json={"title": "x", "body": "y"})
        assert r.status_code == 403


# ---------------- Contact ----------------
class TestContact:
    def test_submit_contact(self, admin_sess):
        msg = f"TEST contact message {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{API}/contact",
                          json={"name": "TEST User", "email": "test@example.com", "message": msg})
        assert r.status_code == 200 and r.json()["ok"] is True
        # admin sees it
        lst = admin_sess.get(f"{API}/admin/contacts").json()
        assert any(c["message"] == msg for c in lst)

    def test_reader_cannot_list_contacts(self, reader_sess):
        r = reader_sess.get(f"{API}/admin/contacts")
        assert r.status_code == 403


# ---------------- Ad plans ----------------
class TestAdPlans:
    def test_public_plans_seeded(self):
        r = requests.get(f"{API}/ads/plans")
        assert r.status_code == 200
        plans = r.json()
        labels = [p["label"] for p in plans]
        assert "Sidebar Rectangle" in labels and "Leaderboard Banner" in labels
        sizes = [p["size"] for p in plans]
        assert "300x250" in sizes and "728x90" in sizes

    def test_admin_create_plan_appears_public(self, admin_sess):
        label = f"TEST Plan {uuid.uuid4().hex[:6]}"
        r = admin_sess.post(f"{API}/admin/ad-plans",
                            json={"label": label, "size": "160x600", "price": 999, "impressions": 1000})
        assert r.status_code == 200
        pid = r.json()["id"]
        pub = requests.get(f"{API}/ads/plans").json()
        assert any(p["label"] == label for p in pub)
        # cleanup
        admin_sess.delete(f"{API}/admin/ad-plans/{pid}")

    def test_reporter_cannot_create_plan(self, reporter_sess):
        r = reporter_sess.post(f"{API}/admin/ad-plans",
                               json={"label": "x", "size": "1x1", "price": 1, "impressions": 1})
        assert r.status_code == 403


# ---------------- Ad purchase / moderation / serve ----------------
class TestAdsFlow:
    def test_full_flow(self, reader_sess, admin_sess):
        # find sidebar 300x250 plan id
        plans = requests.get(f"{API}/ads/plans").json()
        plan = next(p for p in plans if p["size"] == "300x250")
        # purchase
        r = reader_sess.post(f"{API}/ads/purchase", json={
            "plan_id": plan["id"],
            "image_url": "https://picsum.photos/300/250",
            "target_url": "https://example.com",
            "company": "TEST Advertiser"
        })
        assert r.status_code == 200
        j = r.json()
        assert j["ok"] and j["mock_payment"] is True
        ad = j["ad"]
        assert ad["status"] == "pending" and ad["paid"] is True and ad["size"] == "300x250"
        aid = ad["id"]

        # /ads/mine
        mine = reader_sess.get(f"{API}/ads/mine").json()
        assert any(a["id"] == aid for a in mine)

        # admin sees it
        allads = admin_sess.get(f"{API}/admin/ads").json()
        assert any(a["id"] == aid for a in allads)

        # approve -> live
        pat = admin_sess.patch(f"{API}/admin/ads/{aid}", json={"status": "live"})
        assert pat.status_code == 200

        # /ads/active returns and increments served
        act = requests.get(f"{API}/ads/active", params={"size": "300x250"})
        assert act.status_code == 200
        aj = act.json()
        # A live 300x250 ad must be servable now (may be ours or a prior live one, both fine)
        assert aj["ad"] is not None
        assert aj["ad"].get("image_url") and aj["ad"].get("target_url")

        # cleanup - reject the ad so it doesn't affect further tests
        admin_sess.patch(f"{API}/admin/ads/{aid}", json={"status": "rejected"})

    def test_purchase_requires_auth(self):
        r = requests.post(f"{API}/ads/purchase",
                          json={"plan_id": "xxx", "image_url": "x", "target_url": "y"})
        assert r.status_code in (401, 403)

    def test_invalid_moderation_status(self, admin_sess):
        # need a real ad id - create one
        plans = requests.get(f"{API}/ads/plans").json()
        # reuse reader path via a new reader session
        reader = _login_session(READER)
        plan = plans[0]
        buy = reader.post(f"{API}/ads/purchase", json={
            "plan_id": plan["id"], "image_url": "x", "target_url": "y"
        }).json()
        aid = buy["ad"]["id"]
        r = admin_sess.patch(f"{API}/admin/ads/{aid}", json={"status": "bogus"})
        assert r.status_code == 400
        admin_sess.patch(f"{API}/admin/ads/{aid}", json={"status": "rejected"})


# ---------------- Author byline ----------------
class TestAuthor:
    def test_author_page(self, reporter_sess, editor_sess):
        # ensure at least one published article by reporter
        payload = {"title": f"TEST Author {uuid.uuid4().hex[:6]}", "category": "tech",
                   "excerpt": "x", "body": ["p"], "image_url": "https://picsum.photos/600"}
        r = reporter_sess.post(f"{API}/staff/articles", json=payload)
        aid = r.json()["id"]
        editor_sess.post(f"{API}/staff/articles/{aid}/publish")

        author_id = reporter_sess.user["id"]
        ar = requests.get(f"{API}/authors/{author_id}")
        assert ar.status_code == 200
        d = ar.json()
        assert d["id"] == author_id and d["name"] and isinstance(d["articles"], list)
        assert any(a["id"] == aid for a in d["articles"])
        # cleanup
        editor_sess.delete(f"{API}/staff/articles/{aid}")

    def test_author_invalid(self):
        r = requests.get(f"{API}/authors/notanobjectid")
        assert r.status_code == 404


# ---------------- Premium filter ----------------
class TestPremium:
    def test_premium_true_filter(self, reporter_sess, editor_sess):
        payload = {"title": f"TEST Premium {uuid.uuid4().hex[:6]}", "category": "tech",
                   "excerpt": "x", "body": ["p"], "image_url": "https://picsum.photos/600",
                   "is_premium": True}
        r = reporter_sess.post(f"{API}/staff/articles", json=payload)
        aid = r.json()["id"]
        editor_sess.post(f"{API}/staff/articles/{aid}/publish")

        prem = requests.get(f"{API}/articles", params={"premium": "true"}).json()
        assert any(a["id"] == aid for a in prem)
        for a in prem:
            assert a.get("is_premium") is True
        editor_sess.delete(f"{API}/staff/articles/{aid}")

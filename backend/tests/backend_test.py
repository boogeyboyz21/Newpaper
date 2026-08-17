"""Backend integration tests for The Editorial Wire."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://editorial-wire.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "boogeyboyz21@gmail.com", "password": "Admin@12345"}
EDITOR = {"email": "editor@editorialwire.com", "password": "Editor@123"}
REPORTER = {"email": "reporter@editorialwire.com", "password": "Reporter@123"}
READER = {"email": "reader@editorialwire.com", "password": "Reader@123"}


def _login(session, creds):
    r = session.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"login failed for {creds['email']}: {r.status_code} {r.text}"
    data = r.json()
    tok = data["token"]
    session.headers.update({"Authorization": f"Bearer {tok}"})
    return data["user"], tok


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_sess():
    sess = requests.Session()
    _login(sess, ADMIN)
    return sess


@pytest.fixture(scope="session")
def editor_sess():
    sess = requests.Session()
    _login(sess, EDITOR)
    return sess


@pytest.fixture(scope="session")
def reporter_sess():
    sess = requests.Session()
    user, _ = _login(sess, REPORTER)
    sess.user = user
    return sess


@pytest.fixture(scope="session")
def reader_sess():
    sess = requests.Session()
    user, _ = _login(sess, READER)
    sess.user = user
    return sess


# --------------- Health & basic content ---------------
class TestHealthAndPublic:
    def test_health(self, s):
        r = s.get(f"{API}/health"); assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_categories(self, s):
        r = s.get(f"{API}/categories"); assert r.status_code == 200
        slugs = [c["slug"] for c in r.json()]
        for x in ["global", "business", "tech", "lifestyle", "sports"]:
            assert x in slugs

    def test_settings(self, s):
        r = s.get(f"{API}/settings"); assert r.status_code == 200
        assert r.json()["site_name"] == "The Editorial Wire"

    def test_articles_list(self, s):
        r = s.get(f"{API}/articles"); assert r.status_code == 200
        arts = r.json()
        assert isinstance(arts, list) and len(arts) > 0
        assert "id" in arts[0] and "title" in arts[0]

    def test_articles_breaking(self, s):
        r = s.get(f"{API}/articles/breaking"); assert r.status_code == 200

    def test_articles_trending(self, s):
        r = s.get(f"{API}/articles/trending"); assert r.status_code == 200

    def test_articles_by_category(self, s):
        r = s.get(f"{API}/articles?category=tech"); assert r.status_code == 200
        for a in r.json():
            assert a["category"] == "tech"

    def test_article_detail_and_views(self, s):
        arts = s.get(f"{API}/articles").json()
        aid = arts[0]["id"]
        r = s.get(f"{API}/articles/{aid}"); assert r.status_code == 200
        assert r.json()["id"] == aid

    def test_article_not_found(self, s):
        r = s.get(f"{API}/articles/64b0bad0badbadbadbadbad0")
        assert r.status_code == 404

    def test_newsletter(self, s):
        r = s.post(f"{API}/newsletter", json={"email": f"test_{uuid.uuid4().hex[:6]}@example.com"})
        assert r.status_code == 200 and r.json()["ok"] is True


# --------------- Auth ---------------
class TestAuth:
    def test_login_admin(self, s):
        r = s.post(f"{API}/auth/login", json=ADMIN); assert r.status_code == 200
        u = r.json()["user"]; assert u["role"] == "administrator"

    def test_login_editor(self, s):
        r = s.post(f"{API}/auth/login", json=EDITOR)
        assert r.status_code == 200 and r.json()["user"]["role"] == "editor"

    def test_login_reporter(self, s):
        r = s.post(f"{API}/auth/login", json=REPORTER)
        assert r.status_code == 200 and r.json()["user"]["role"] == "reporter"

    def test_login_reader(self, s):
        r = s.post(f"{API}/auth/login", json=READER)
        assert r.status_code == 200 and r.json()["user"]["role"] == "subscriber"

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@example.com", "password": "wrong"})
        assert r.status_code in (401, 429)

    def test_register_new_user(self, s):
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/auth/register", json={"name": "T User", "email": email, "password": "Pass@123"})
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["email"] == email and u["role"] == "subscriber"

    def test_me(self, admin_sess):
        r = admin_sess.get(f"{API}/auth/me"); assert r.status_code == 200
        assert r.json()["role"] == "administrator"


# --------------- Weather ---------------
class TestWeather:
    def test_weather_ip(self, s):
        r = s.get(f"{API}/weather/ip"); assert r.status_code == 200
        d = r.json()
        assert "temp" in d and "aqi" in d and "forecast" in d
        assert d["aqi"]["category"] in ("Good", "Moderate", "Poor", "Unhealthy", "Very Unhealthy", "Hazardous")

    def test_weather_city(self, s):
        r = s.get(f"{API}/weather", params={"city": "London"}); assert r.status_code == 200
        d = r.json(); assert "city" in d and "temp" in d


# --------------- Comments ---------------
class TestComments:
    @pytest.fixture(scope="class")
    def article_id(self):
        arts = requests.get(f"{API}/articles").json()
        return arts[0]["id"]

    def test_post_guest_comment(self, s, article_id):
        body = f"TEST_comment good article {uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/articles/{article_id}/comments",
                   json={"body": body, "author_name": "GuestTester"})
        assert r.status_code == 200
        d = r.json(); assert d["moderated"] is False
        assert d["comment"]["author_name"] == "GuestTester"

    def test_post_profane_comment_hidden(self, s, article_id):
        r = s.post(f"{API}/articles/{article_id}/comments",
                   json={"body": "this is stupid", "author_name": "G"})
        assert r.status_code == 200
        assert r.json()["moderated"] is True
        assert r.json()["comment"]["status"] == "hidden"

    def test_list_comments_excludes_hidden(self, s, article_id):
        r = s.get(f"{API}/articles/{article_id}/comments"); assert r.status_code == 200
        for c in r.json():
            assert c.get("status") in (None, "approved")

    def test_upvote_comment(self, s, article_id):
        r = s.post(f"{API}/articles/{article_id}/comments",
                   json={"body": "TEST upvote target", "author_name": "G"})
        cid = r.json()["comment"]["id"]
        r2 = s.post(f"{API}/comments/{cid}/upvote"); assert r2.status_code == 200
        assert r2.json()["upvotes"] == 1

    def test_reply_threading(self, s, article_id):
        parent = s.post(f"{API}/articles/{article_id}/comments",
                        json={"body": "TEST parent", "author_name": "P"}).json()["comment"]
        reply = s.post(f"{API}/articles/{article_id}/comments",
                       json={"body": "TEST reply", "author_name": "R", "parent_id": parent["id"]})
        assert reply.status_code == 200
        # verify tree
        tree = s.get(f"{API}/articles/{article_id}/comments").json()
        found = False
        for c in tree:
            if c["id"] == parent["id"]:
                found = any(rr["id"] == reply.json()["comment"]["id"] for rr in c.get("replies", []))
        assert found


# --------------- Payments (mock) ---------------
class TestPayments:
    def test_plans(self, s):
        r = s.get(f"{API}/payments/plans"); assert r.status_code == 200
        d = r.json(); assert d["mock_mode"] is True
        ids = [p["id"] for p in d["plans"]]
        assert "monthly" in ids and "annual" in ids

    def test_create_and_verify_order_wb_gst(self, reader_sess):
        r = reader_sess.post(f"{API}/payments/create-order",
                             json={"plan_id": "monthly", "state": "West Bengal",
                                   "company_name": "TEST Co", "gstin": "19AAAAA0000A1Z5"})
        assert r.status_code == 200
        d = r.json()
        assert d["order_id"].startswith("order_mock_")
        bk = d["breakdown"]
        # WB -> CGST + SGST (9%+9%)
        assert bk["igst"] == 0.0 and bk["cgst"] > 0 and bk["sgst"] > 0
        assert round(bk["cgst"] + bk["sgst"], 2) == round(bk["gst"], 2)

        v = reader_sess.post(f"{API}/payments/verify", json={"order_id": d["order_id"]})
        assert v.status_code == 200
        vd = v.json(); assert vd["ok"] and vd["subscription"]["status"] == "active"
        assert "invoice_id" in vd
        # invoice list
        inv = reader_sess.get(f"{API}/payments/invoices").json()
        assert len(inv) >= 1
        # download PDF
        pdf = reader_sess.get(f"{API}/payments/invoices/{vd['invoice_id']}/pdf")
        assert pdf.status_code == 200
        assert pdf.headers.get("content-type", "").startswith("application/pdf")
        assert pdf.content[:4] == b"%PDF"

    def test_create_order_non_wb_igst(self, reader_sess):
        r = reader_sess.post(f"{API}/payments/create-order",
                             json={"plan_id": "annual", "state": "Karnataka"})
        assert r.status_code == 200
        bk = r.json()["breakdown"]
        assert bk["cgst"] == 0.0 and bk["sgst"] == 0.0 and bk["igst"] > 0

    def test_cancel_subscription(self, reader_sess):
        r = reader_sess.post(f"{API}/payments/cancel")
        # After activation above it should succeed. If already cancelling, 400.
        assert r.status_code in (200, 400)


# --------------- Admin RBAC ---------------
class TestAdminRBAC:
    def test_admin_stats(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/stats"); assert r.status_code == 200
        assert "articles" in r.json()

    def test_admin_list_users(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/users"); assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) >= 4

    def test_admin_audit_logs(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/audit-logs"); assert r.status_code == 200

    def test_admin_invoices(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/invoices"); assert r.status_code == 200

    def test_admin_gst_export(self, admin_sess):
        r = admin_sess.get(f"{API}/admin/gst-export"); assert r.status_code == 200
        assert "Invoice No" in r.text.split("\n")[0]

    def test_reader_forbidden_admin(self, reader_sess):
        r = reader_sess.get(f"{API}/admin/users"); assert r.status_code == 403

    def test_reporter_forbidden_admin(self, reporter_sess):
        r = reporter_sess.get(f"{API}/admin/users"); assert r.status_code == 403

    def test_editor_can_view_comments(self, editor_sess):
        r = editor_sess.get(f"{API}/admin/comments"); assert r.status_code == 200

    def test_editor_cannot_list_users(self, editor_sess):
        r = editor_sess.get(f"{API}/admin/users"); assert r.status_code == 403

    def test_admin_create_change_delete_user(self, admin_sess):
        email = f"test_staff_{uuid.uuid4().hex[:6]}@example.com"
        r = admin_sess.post(f"{API}/admin/users",
                            json={"name": "T Staff", "email": email, "password": "Pass@1234", "role": "reporter"})
        assert r.status_code == 200
        uid = r.json()["id"]
        r2 = admin_sess.patch(f"{API}/admin/users/{uid}/role", json={"role": "editor"})
        assert r2.status_code == 200
        r3 = admin_sess.delete(f"{API}/admin/users/{uid}"); assert r3.status_code == 200


# --------------- Staff articles RBAC ---------------
class TestStaffArticles:
    def test_reporter_create_and_submit(self, reporter_sess):
        payload = {"title": f"TEST Draft {uuid.uuid4().hex[:6]}", "subtitle": "", "category": "tech",
                   "excerpt": "excerpt", "body": ["Para 1", "Para 2"],
                   "image_url": "https://picsum.photos/600", "tags": ["test"], "is_premium": True}
        r = reporter_sess.post(f"{API}/staff/articles", json=payload)
        assert r.status_code == 200
        art = r.json(); assert art["status"] == "draft"
        aid = art["id"]
        r2 = reporter_sess.post(f"{API}/staff/articles/{aid}/submit"); assert r2.status_code == 200

    def test_reporter_cannot_publish(self, reporter_sess):
        payload = {"title": "TEST Reporter Pub", "category": "tech", "excerpt": "x",
                   "body": ["p"], "image_url": "https://picsum.photos/600"}
        r = reporter_sess.post(f"{API}/staff/articles", json=payload)
        aid = r.json()["id"]
        pub = reporter_sess.post(f"{API}/staff/articles/{aid}/publish")
        assert pub.status_code == 403

    def test_editor_can_publish(self, reporter_sess, editor_sess):
        payload = {"title": "TEST Editor Pub", "category": "tech", "excerpt": "x",
                   "body": ["p"], "image_url": "https://picsum.photos/600"}
        r = reporter_sess.post(f"{API}/staff/articles", json=payload)
        aid = r.json()["id"]
        pub = editor_sess.post(f"{API}/staff/articles/{aid}/publish")
        assert pub.status_code == 200
        # cleanup
        editor_sess.delete(f"{API}/staff/articles/{aid}")

    def test_reader_cannot_access_staff(self, reader_sess):
        r = reader_sess.get(f"{API}/staff/articles"); assert r.status_code == 403


# --------------- Push ---------------
class TestPush:
    def test_vapid_key(self, s):
        r = s.get(f"{API}/push/vapid-public-key"); assert r.status_code == 200
        assert len(r.json()["public_key"]) > 20

    def test_broadcast_admin_ok(self, admin_sess):
        r = admin_sess.post(f"{API}/push/broadcast",
                            json={"title": "TEST", "body": "hello", "url": "/"})
        assert r.status_code == 200
        d = r.json(); assert d["ok"] is True

    def test_broadcast_forbidden(self, reader_sess):
        r = reader_sess.post(f"{API}/push/broadcast",
                             json={"title": "x", "body": "y", "url": "/"})
        assert r.status_code == 403

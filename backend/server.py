from fastapi import FastAPI
from dotenv import load_dotenv
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from starlette.middleware.cors import CORSMiddleware  # noqa: E402
from database import client  # noqa: E402
from auth_routes import router as auth_router  # noqa: E402
from content_routes import router as content_router  # noqa: E402
from weather_routes import router as weather_router  # noqa: E402
from payments_routes import router as payments_router  # noqa: E402
from admin_routes import router as admin_router  # noqa: E402
from push_routes import router as push_router  # noqa: E402
from extra_routes import router as extra_router  # noqa: E402
from seed import seed  # noqa: E402

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="The Editorial Wire API")

app.include_router(auth_router)
app.include_router(content_router)
app.include_router(weather_router)
app.include_router(payments_router)
app.include_router(admin_router)
app.include_router(push_router)
app.include_router(extra_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


allowed = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")]
fe = os.environ.get("FRONTEND_URL")
if fe and fe not in allowed:
    allowed.append(fe)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed()
    logger.info("Startup seeding complete.")


@app.on_event("shutdown")
async def shutdown():
    client.close()

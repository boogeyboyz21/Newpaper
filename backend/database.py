import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


def serialize(doc):
    """Convert a MongoDB document to a JSON-safe dict (ObjectId -> str id)."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    return doc


async def get_settings():
    """Site-wide runtime settings (API keys, analytics) stored by admins."""
    doc = await db.settings.find_one({"key": "site"}) or {}
    doc.pop("_id", None)
    return doc

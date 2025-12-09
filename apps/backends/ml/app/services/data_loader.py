# app/services/data_loader.py
import os
import requests
import math
import pandas as pd
from typing import Tuple, List, Dict
from app.utils.logger import logger
from app.config import config 

EXPRESS_BASE = config.EXPRESS_ML_URL
ML_SECRET = config.ML_SECRET

HEADERS = {
    "Authorization": f"Bearer {ML_SECRET}",
    "Accept": "application/json"
}

def _fetch_all(endpoint: str, page_size: int = 1000) -> List[Dict]:
    """
    Generic paginated fetcher from Express. Expects response.json() to contain:
    { status:"ok", count: N, items: [ ... ] } or for interactions { interactions: [...] }
    """
    results = []
    page = 1
    while True:
        url = f"{EXPRESS_BASE}/api/ml/{endpoint}?page={page}&pageSize={page_size}"
        logger.info("Fetching ML data from %s", url)
        r = requests.get(url, headers=HEADERS, timeout=30)
        if r.status_code != 200:
            logger.error("Failed fetching %s: %s %s", endpoint, r.status_code, r.text)
            raise RuntimeError(f"Failed to fetch {endpoint}: {r.status_code}")
        j = r.json()
        # flexible handling
        chunk = j.get("items") or j.get("interactions") or j.get("users") or []
        if not chunk:
            break
        results.extend(chunk)
        # if result size < page_size assume last page
        if len(chunk) < page_size:
            break
        page += 1
        # safety cap
        if page > 5000:
            break
    return results

def load_data_from_express() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Returns: items_df, interactions_df
    Items must contain itemId, title, description, tags, category, price
    Interactions must contain userId, itemId, interaction, timestamp
    """
    items = _fetch_all("items", page_size=500)
    interactions = _fetch_all("interactions", page_size=1000)

    items_df = pd.DataFrame(items)
    interactions_df = pd.DataFrame(interactions)

    # normalize columns if necessary
    if "tags" in items_df.columns and isinstance(items_df.loc[0,"tags"], list):
        items_df["tags"] = items_df["tags"].apply(lambda t: ",".join(t) if isinstance(t, list) else (t or ""))

    # ensure price numeric
    if "price" in items_df.columns:
        items_df["price"] = pd.to_numeric(items_df["price"], errors="coerce").fillna(0.0)

    # ensure interactions canonical names
    if "interaction" in interactions_df.columns:
        interactions_df["interaction"] = interactions_df["interaction"].str.lower().fillna("view")
    else:
        interactions_df["interaction"] = "view"

    # ensure required columns exist
    for c in ["userId", "itemId", "interaction", "timestamp"]:
        if c not in interactions_df.columns:
            interactions_df[c] = None

    # If no interactions present, return empty df
    return items_df.fillna(""), interactions_df.fillna("")

# Small helper used by debug endpoints
def quick_preview():
    items, interactions = load_data_from_express()
    return items.head(5).to_dict(orient="records"), interactions.head(5).to_dict(orient="records")

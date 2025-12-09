# app/recommender/lightfm_model.py
import os
import joblib
import numpy as np
import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from app.utils.logger import logger
from typing import List, Dict, Any

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")
os.makedirs(MODELS_DIR, exist_ok=True)
MODEL_FILE = os.path.join(MODELS_DIR, "lightfm_model.pkl")
DATASET_FILE = os.path.join(MODELS_DIR, "lightfm_dataset.joblib")
ITEM_MAP_FILE = os.path.join(MODELS_DIR, "item_id_map.joblib")
USER_MAP_FILE = os.path.join(MODELS_DIR, "user_id_map.joblib")
ITEM_EMB_FILE = os.path.join(MODELS_DIR, "item_embeddings.npy")

# We store interaction weights:
INTERACTION_WEIGHTS = {
    "view": 1.0,
    "click": 2.0,
    "favorite": 5.0,
    "book": 10.0,
    "review": 6.0
}

class Trainer:
    def __init__(self):
        pass

    def train(self, items_df: pd.DataFrame, interactions_df: pd.DataFrame,
              epochs: int = 20, no_components: int = 30):
        logger.info("Preparing dataset for LightFM")
        dataset = Dataset()
        users = interactions_df["userId"].unique().tolist()
        items = items_df["itemId"].unique().tolist()

        dataset.fit(users, items)

        # Build interactions list with weights
        interaction_records = []
        for _, r in interactions_df.iterrows():
            user = str(r["userId"])
            item = str(r["itemId"])
            itype = str(r.get("interaction", "view")).lower()
            weight = INTERACTION_WEIGHTS.get(itype, 1.0)
            interaction_records.append((user, item, weight))

        (interactions_matrix, weights_matrix) = dataset.build_interactions(
            [(u, i, w) for (u, i, w) in interaction_records]
        )

        logger.info("Fitting LightFM model")
        model = LightFM(loss="warp", no_components=no_components)
        model.fit(interactions_matrix, sample_weight=weights_matrix, epochs=epochs, num_threads=4)

        # Save model and dataset
        joblib.dump(model, MODEL_FILE)
        joblib.dump(dataset, DATASET_FILE)

        # Maintain mappings (the dataset instance has mappings we can use via dataset.mapping())
        user_map = dataset._user_id_mapping
        item_map = dataset._item_id_mapping
        joblib.dump(user_map, USER_MAP_FILE)
        joblib.dump(item_map, ITEM_MAP_FILE)

        # Compute & save item embeddings (using model.get_item_representations)
        try:
            item_embeddings = model.get_item_representations()[1]  # second is item embeddings
            np.save(ITEM_EMB_FILE, item_embeddings)
        except Exception as e:
            logger.warning("Failed to derive item embeddings: %s", e)

        logger.info("Training done and artifacts saved.")

class LightFMRecommender:
    def __init__(self):
        self.model = None
        self.dataset = None
        self.user_map = None
        self.item_map = None
        self.item_id_from_index = None
        self.item_embeddings = None
        self._load_artifacts()

    def _load_artifacts(self):
        if os.path.exists(MODEL_FILE) and os.path.exists(DATASET_FILE):
            try:
                self.model = joblib.load(MODEL_FILE)
                self.dataset = joblib.load(DATASET_FILE)
                self.user_map = joblib.load(USER_MAP_FILE)
                self.item_map = joblib.load(ITEM_MAP_FILE)
                # invert item_map
                self.item_id_from_index = {v: k for k, v in self.item_map.items()}
                if os.path.exists(ITEM_EMB_FILE):
                    self.item_embeddings = np.load(ITEM_EMB_FILE)
            except Exception as e:
                logger.error("Error loading artifacts: %s", e)

    def is_ready(self):
        return self.model is not None and self.dataset is not None

    def recommend_for_user(self, user_id: str, n: int = 10) -> List[Dict[str, Any]]:
        if not self.is_ready():
            return None

        user_map = self.user_map
        item_map = self.item_map

        if user_id not in user_map:
            # cold start: return popular items (by item embedding norms)
            return self._cold_start_recommend(n)

        u_index = user_map[user_id]
        n_items = len(item_map)
        # predict scores for all items
        scores = self.model.predict(u_index, np.arange(n_items))
        # get top n indices
        top_indices = np.argsort(-scores)[:n]
        results = []
        for idx in top_indices:
            item_id = self.item_id_from_index.get(idx)
            results.append({"itemId": item_id, "score": float(scores[idx])})
        return results

    def _cold_start_recommend(self, n=10):
        # fallback: top-k by item embedding norm if available; else by item index
        if self.item_embeddings is not None:
            norms = np.linalg.norm(self.item_embeddings, axis=1)
            top = np.argsort(-norms)[:n]
            return [{"itemId": self.item_id_from_index.get(int(i)), "score": float(norms[int(i)])} for i in top]
        else:
            # return first n items
            return [{"itemId": k, "score": 0.0} for k in list(self.item_map.keys())[:n]]

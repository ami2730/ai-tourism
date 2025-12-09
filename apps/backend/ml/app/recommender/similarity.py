# app/recommender/similarity.py
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
from app.utils.logger import logger

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "models")
TFIDF_FILE = os.path.join(MODELS_DIR, "tfidf.joblib")
TFIDF_MATRIX_FILE = os.path.join(MODELS_DIR, "tfidf_matrix.npy")
ITEMS_IDX_FILE = os.path.join(MODELS_DIR, "items_index.joblib")

class ContentSimilarity:
    def __init__(self):
        self.vectorizer = None
        self.tfidf_matrix = None
        self.items_index = None
        self._load()

    def build(self, items_df):
        # Build a simple text field
        texts = (items_df.get("title", "") + " " + items_df.get("description", "") + " " + items_df.get("tags", "")).fillna("").astype(str)
        vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
        tfidf = vectorizer.fit_transform(texts)
        joblib.dump(vectorizer, TFIDF_FILE)
        np.save(TFIDF_MATRIX_FILE, tfidf.todense())
        # store mapping from index to itemId
        items_index = dict(enumerate(items_df["itemId"].tolist()))
        joblib.dump(items_index, ITEMS_IDX_FILE)
        self.vectorizer = vectorizer
        self.tfidf_matrix = tfidf
        self.items_index = items_index
        logger.info("Content similarity built and saved.")

    def _load(self):
        if os.path.exists(TFIDF_FILE) and os.path.exists(TFIDF_MATRIX_FILE) and os.path.exists(ITEMS_IDX_FILE):
            try:
                self.vectorizer = joblib.load(TFIDF_FILE)
                mat = np.load(TFIDF_MATRIX_FILE)
                # mat saved as dense; convert back to csr if needed
                from scipy.sparse import csr_matrix
                self.tfidf_matrix = csr_matrix(mat)
                self.items_index = joblib.load(ITEMS_IDX_FILE)
            except Exception as e:
                logger.warning("Failed loading TFIDF artifacts: %s", e)

    def is_ready(self):
        return self.vectorizer is not None and self.tfidf_matrix is not None and self.items_index is not None

    def most_similar(self, item_id, topn=8):
        if not self.is_ready():
            return None
        # find index for item_id
        inv = {v:k for k,v in self.items_index.items()}
        if item_id not in inv:
            return []
        idx = inv[item_id]
        cosine_similarities = linear_kernel(self.tfidf_matrix[idx:idx+1], self.tfidf_matrix).flatten()
        related_docs_indices = cosine_similarities.argsort()[:-topn-1:-1]
        results = []
        for i in related_docs_indices:
            if i == idx:  # skip self
                continue
            results.append({"itemId": self.items_index.get(int(i)), "score": float(cosine_similarities[i])})
        return results

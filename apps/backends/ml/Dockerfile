FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (for numpy / lightfm compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code and models
COPY app ./app
COPY models ./models

ENV PYTHONPATH=/app
EXPOSE 8000

# Use --reload for hot-reload in development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]




# ── Stage 1 : builder ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

COPY requirements.txt .

RUN pip install --upgrade pip \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2 : runtime ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup appuser

WORKDIR /app

COPY --from=builder /install /usr/local
COPY app/ ./app/

USER appuser

# Cloud Run injecte PORT automatiquement (défaut 8080)
ENV PORT=8080

CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1

FROM python:3.10-slim

# Install system dependencies & Node.js for building frontend
RUN apt-get update && apt-get install -y ffmpeg curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Build frontend
COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm install && npm run build

# Return to root
WORKDIR /app

# Copy backend code
COPY backend ./backend

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

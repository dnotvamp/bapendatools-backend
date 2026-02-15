# =========================
# STAGE 1: Build (NestJS)
# =========================
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build NestJS
RUN npm run build



# =========================
# STAGE 2: Production
# =========================
FROM node:20-slim

# -------------------------
# Install system deps for OpenCV & YOLO
# -------------------------
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -------------------------
# Copy built app
# -------------------------
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# -------------------------
# Copy Python files
# -------------------------
COPY requirements.txt ./
COPY autocrop_folder.py ./
COPY imgestoword.py ./
COPY organize_images.py ./
COPY best.pt ./

# -------------------------
# Install Node production deps only
# -------------------------
RUN npm install --omit=dev

# -------------------------
# Create Python virtualenv
# -------------------------
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# -------------------------
# Install Python deps
# -------------------------
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# -------------------------
# Set Railway port
# -------------------------
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/main.js"]

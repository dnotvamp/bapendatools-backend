# =========================
# STAGE 1: Build
# =========================
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# =========================
# STAGE 2: Production
# =========================
FROM node:20-slim

# Install python minimal
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY requirements.txt ./
COPY autocrop_folder.py ./
COPY imgestoword.py ./
COPY organize_images.py ./
COPY best.pt ./

# Install node prod only
RUN npm install --omit=dev

# Python venv
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8080

CMD ["node", "dist/main.js"]

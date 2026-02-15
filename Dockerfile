FROM node:20

# =====================================
# 1️⃣ Install system dependencies
# =====================================
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =====================================
# 2️⃣ Install Node dependencies
# =====================================
COPY package*.json ./
RUN npm install

# =====================================
# 3️⃣ Create Python virtual environment
# =====================================
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip inside venv
RUN pip install --upgrade pip

# =====================================
# 4️⃣ Install Python dependencies
# =====================================
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# =====================================
# 5️⃣ Copy project files
# =====================================
COPY . .

# =====================================
# 6️⃣ Build NestJS
# =====================================
RUN npm run build

# =====================================
# 7️⃣ Railway Port
# =====================================
EXPOSE 8080

# =====================================
# 8️⃣ Start App
# =====================================
CMD ["npm", "run", "start"]

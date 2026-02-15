FROM node:20

# Install python
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json
COPY package*.json ./
RUN npm install

# ==============================
# 🔥 BUAT VIRTUAL ENV
# ==============================
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements
COPY requirements.txt ./
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Build Nest
RUN npm run build

EXPOSE 8080

CMD ["npm", "run", "start"]

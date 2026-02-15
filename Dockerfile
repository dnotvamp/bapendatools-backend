FROM node:20

# Install Python + pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# ==============================
# 1️⃣ Install Node dependencies
# ==============================
COPY package*.json ./
RUN npm install

# ==============================
# 2️⃣ Install Python dependencies
# ==============================
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# ==============================
# 3️⃣ Copy all project files
# ==============================
COPY . .

# ==============================
# 4️⃣ Build NestJS
# ==============================
RUN npm run build

# ==============================
# 5️⃣ Expose Railway port
# ==============================
EXPOSE 8080

# ==============================
# 6️⃣ Start app
# ==============================
CMD ["npm", "run", "start"]

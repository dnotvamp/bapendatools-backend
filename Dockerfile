FROM node:20

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node deps
RUN npm install

# Copy project
COPY . .

# Build NestJS
RUN npm run build

# Expose port
EXPOSE 8080

# Start app
CMD ["npm", "run", "start"]

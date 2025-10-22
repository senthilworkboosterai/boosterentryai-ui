# ---------- Base Image ----------
FROM python:3.13-slim

# ---------- Working Directory ----------
WORKDIR /app

# ---------- Install OS Packages ----------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl gnupg build-essential libpq-dev && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# ---------- Install Python Dependencies ----------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- Install Frontend Dependencies ----------
COPY package*.json vite.config.* ./
RUN npm install

# ---------- Copy Application Files ----------
COPY . .

# ---------- Expose Flask and React Ports ----------
EXPOSE 30010 30012

# ---------- Copy Entry Script ----------
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# ---------- Start Both Servers ----------
CMD ["/docker-entrypoint.sh"]

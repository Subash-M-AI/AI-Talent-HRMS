FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Run development server to support reviews and hot-reloads
EXPOSE 3000

CMD ["npm", "run", "dev"]

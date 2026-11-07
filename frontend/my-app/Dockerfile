FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npm", "run", "start", "--", "--host", "lan", "--port", "8081"]

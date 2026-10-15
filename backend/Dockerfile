FROM node:24-alpine

WORKDIR /app

COPY package*.json ./
COPY .npmrc ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM node:20-alpine

WORKDIR /app

COPY . .

RUN npm install --legacy-peer-deps

CMD ["sh", "-c", "npm run build && npm start"]

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

VOLUME ["/app/data"]

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "run", "dev"]

FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY  prisma ./prisma

RUN npx prisma generate

COPY . .

EXPOSE 5000

CMD [ "npm","run", "dev" ]


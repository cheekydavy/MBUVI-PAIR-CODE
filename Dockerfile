FROM node:20-bullseye

RUN apt-get update && apt-get install -y

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .
RUN mkdir -p /usr/src/app/temp && chown -R node:node /usr/src/app
CMD ["node", "mbuvi.js"]

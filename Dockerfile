# Dockerfile to build a production container which listens on port as defined by environment variable

FROM node:alpine


WORKDIR /usr/src/app

COPY package*.json ./
RUN yarn install
COPY . .


CMD [ "yarn", "start" ]

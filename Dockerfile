FROM node:22-slim

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app

FROM node:22-slim AS build

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:22-slim

RUN corepack enable && corepack prepare yarn@1.22.22 --activate

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY server/ server/
COPY --from=build /app/dist dist/

CMD ["node", "server/index.js"]

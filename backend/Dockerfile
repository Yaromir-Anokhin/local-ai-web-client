FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

ENV PORT=3001
ENV OLLAMA_HOST=http://host.docker.internal:11434

EXPOSE 3001

CMD ["node", "src/index.js"]

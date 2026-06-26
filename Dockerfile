FROM node:22-alpine
WORKDIR /app
COPY package.json server.js selftest.js ./
EXPOSE 7483
# default = vulnerable target; override with -e SECURE=1 -e PORT=7484 for the secure twin
CMD ["node", "server.js"]

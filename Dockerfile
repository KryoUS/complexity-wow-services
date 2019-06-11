# specify the node base image with your desired version node:<version>
FROM node:10-alpine
# Create app director
WORKDIR /usr/src/app
# Copy package.json and package-lock.json
COPY package*.json ./
# Install Dependencies
RUN npm install
# Copy app
COPY . .
# Run index.js
CMD ["node", "index.js"]
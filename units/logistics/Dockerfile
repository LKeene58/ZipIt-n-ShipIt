# Use a lightweight Node base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package files first (to cache dependencies)
COPY package*.json ./

# Install dependencies
RUN npm install

# ... existing setup ...
COPY . .

# Add this line here (Node images come with a non-root 'node' user built-in)
USER node

CMD ["npm", "start"]
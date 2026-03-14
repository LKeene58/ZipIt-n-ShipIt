# Use a lightweight Node base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package files first (to cache dependencies)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the unit's code
COPY . .

# Start the agent
CMD ["npm", "start"]
# Use Node.js with a specific version and Alpine Linux base image
ARG NODE_VERSION=22.8.0
FROM node:${NODE_VERSION}-alpine

# Set the NODE_ENV to development for better debugging
ENV NODE_ENV=development

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./

# Install dependencies (including devDependencies, since nodemon is in devDependencies)
RUN npm install

# Install nodemon globally for ease of use
RUN npm install -g nodemon

# Change the user to a non-root user for security
USER node

# Copy the rest of the application files
COPY . .

# Expose the port the application runs on
EXPOSE 3000

# Start the application with nodemon
CMD ["nodemon", "--inspect=0.0.0.0", "main.js", "--", "-h", "0.0.0.0", "-p", "3000", "-c", "./cache"]

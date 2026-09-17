FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Vite application
RUN npm run build

# Use Nginx to serve the static files
FROM nginx:1.27-alpine

# Copy the built files from the builder stage to Nginx's default directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the frontend-specific nginx configuration for client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

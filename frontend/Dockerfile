# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Fix any title issues before building
RUN sed -i 's/Y - Image Sharing/Y Image Sharing/g' index.html
RUN sed -i 's/Y - Image Sharing/Y Image Sharing/g' src/App.tsx

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Final check to ensure title is correct in the built HTML
RUN sed -i 's/Y - Image Sharing/Y Image Sharing/g' /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

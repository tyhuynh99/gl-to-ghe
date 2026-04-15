#!/bin/bash

# Define the image name
IMAGE_NAME="gl-to-ghe"
PORT=3000

echo "🚀 Building Docker image: $IMAGE_NAME..."
docker build -t "$IMAGE_NAME" .

if [ $? -ne 0 ]; then
  echo "❌ Docker build failed. Please check the errors above."
  exit 1
fi

echo "✅ Build successful!"
echo "🚀 Starting the container on port $PORT..."
echo "👉 You can access the Web UI at: http://localhost:$PORT"

# Run the container
docker run -it -p "$PORT:$PORT" "$IMAGE_NAME"

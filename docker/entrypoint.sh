#!/bin/bash

# Entrypoint script to read Docker secrets and set environment variables

# Function to read secret file and set environment variable
set_secret_env() {
    local secret_file="$1"
    local env_var="$2"
    
    if [ -f "$secret_file" ]; then
        export "$env_var=$(cat "$secret_file" | tr -d '\r\n')"
        echo "Set $env_var from secret file"
    else
        echo "Warning: Secret file $secret_file not found"
    fi
}

# Read database secrets
if [ -f "/run/secrets/db_password" ]; then
    export DB_PASSWORD=$(cat /run/secrets/db_password | tr -d '\r\n')
fi

# Read Cloudinary secrets
if [ -f "/run/secrets/cloudinary_cloud_name" ]; then
    export CLOUDINARY_CLOUD_NAME=$(cat /run/secrets/cloudinary_cloud_name | tr -d '\r\n')
fi

if [ -f "/run/secrets/cloudinary_api_key" ]; then
    export CLOUDINARY_API_KEY=$(cat /run/secrets/cloudinary_api_key | tr -d '\r\n')
fi

if [ -f "/run/secrets/cloudinary_api_secret" ]; then
    export CLOUDINARY_API_SECRET=$(cat /run/secrets/cloudinary_api_secret | tr -d '\r\n')
fi

echo "Environment variables set from Docker secrets"

# Execute the main command
exec "$@"

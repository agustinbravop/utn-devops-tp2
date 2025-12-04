#!/bin/sh

# Vite bundles environment variables at build time.
# This means that the container image does not read environment variables at runtime.
# That would force us to build a new image every time we want to change an environment variable.
# To avoid it, we can use placeholder values in those variables and then replace them at runtime.

VITE_API_URL="${VITE_API_URL:-http://backend.app.svc.cluster.local/api}"

# Replace placeholder values with current environment variable values.
find /usr/share/nginx/html -type f -exec sed -i "s|__VITE_API_URL__|${VITE_API_URL}|g" {} +

# Start the main process (nginx).
exec "$@"

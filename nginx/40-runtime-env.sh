#!/bin/sh
set -eu

: "${API_BASE_URL:?API_BASE_URL is required}"

# Runtime config read by resolveEnvironment() so the same image works in any environment
cat > /usr/share/nginx/html/environment.js <<EOF
window.__env = { production: true, appVersion: "${APP_VERSION:-1.0.0}", api: { baseurl: "${API_BASE_URL}" } };
EOF

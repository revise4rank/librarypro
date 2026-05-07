#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root." >&2
  exit 1
fi

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
TOKEN_FILE="${HOSTINGER_API_TOKEN_FILE:-/root/.secrets/booklib/hostinger-api-token}"
RENEWAL_CONF="${CERTBOT_RENEWAL_CONF:-/etc/letsencrypt/renewal/booklib-wildcard.conf}"
AUTH_HOOK="/usr/local/sbin/booklib-hostinger-dns-auth.sh"
CLEANUP_HOOK="/usr/local/sbin/booklib-hostinger-dns-cleanup.sh"
DEPLOY_HOOK="/etc/letsencrypt/renewal-hooks/deploy/booklib-reload-nginx.sh"

mkdir -p "$(dirname "$TOKEN_FILE")"
chmod 700 "$(dirname "$TOKEN_FILE")"

if [ -n "${HOSTINGER_API_TOKEN:-}" ]; then
  printf "%s" "$HOSTINGER_API_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
fi

if [ ! -s "$TOKEN_FILE" ]; then
  echo "Set HOSTINGER_API_TOKEN or create $TOKEN_FILE before running this installer." >&2
  exit 2
fi

install -m 755 "$SCRIPT_DIR/hostinger-dns-auth.sh" "$AUTH_HOOK"
install -m 755 "$SCRIPT_DIR/hostinger-dns-cleanup.sh" "$CLEANUP_HOOK"

mkdir -p "$(dirname "$DEPLOY_HOOK")"
cat > "$DEPLOY_HOOK" <<'HOOK'
#!/bin/sh
set -eu
systemctl reload nginx
HOOK
chmod 755 "$DEPLOY_HOOK"

if [ ! -f "$RENEWAL_CONF" ]; then
  echo "Certbot renewal config not found: $RENEWAL_CONF" >&2
  exit 3
fi

cp "$RENEWAL_CONF" "$RENEWAL_CONF.$(date +%Y%m%d%H%M%S).bak"

set_renewal_param() {
  key="$1"
  value="$2"
  if grep -q "^$key =" "$RENEWAL_CONF"; then
    sed -i "s|^$key =.*|$key = $value|" "$RENEWAL_CONF"
  else
    sed -i "/^\[renewalparams\]/a $key = $value" "$RENEWAL_CONF"
  fi
}

set_renewal_param authenticator manual
set_renewal_param preferred_challenges dns
set_renewal_param manual_auth_hook "$AUTH_HOOK"
set_renewal_param manual_cleanup_hook "$CLEANUP_HOOK"
set_renewal_param manual_public_ip_logging_ok True

echo "Installed Hostinger DNS auth hook for booklib-wildcard."
echo "Run: certbot renew --cert-name booklib-wildcard --dry-run"


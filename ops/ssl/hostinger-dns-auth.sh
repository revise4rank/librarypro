#!/bin/sh
set -eu

: "${CERTBOT_DOMAIN:?CERTBOT_DOMAIN is required}"
: "${CERTBOT_VALIDATION:?CERTBOT_VALIDATION is required}"

TOKEN_FILE="${HOSTINGER_API_TOKEN_FILE:-/root/.secrets/booklib/hostinger-api-token}"
ZONE_DOMAIN="${HOSTINGER_ZONE_DOMAIN:-booklib.in}"
API_BASE="${HOSTINGER_API_BASE:-https://developers.hostinger.com/api/dns/v1/zones}"
RECORD_NAME="${HOSTINGER_ACME_RECORD_NAME:-_acme-challenge}"
RECORD_TTL="${HOSTINGER_ACME_TTL:-300}"
PROPAGATION_SECONDS="${HOSTINGER_DNS_PROPAGATION_SECONDS:-120}"
RESPONSE_FILE="${HOSTINGER_DNS_RESPONSE_FILE:-/tmp/booklib-hostinger-dns-auth-response.json}"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "Hostinger API token file is missing: $TOKEN_FILE" >&2
  exit 1
fi

TOKEN="$(tr -d '\r\n' < "$TOKEN_FILE")"
if [ -z "$TOKEN" ]; then
  echo "Hostinger API token file is empty: $TOKEN_FILE" >&2
  exit 1
fi

PAYLOAD='{"overwrite":true,"zone":[{"name":"'"$RECORD_NAME"'","type":"TXT","ttl":'"$RECORD_TTL"',"records":[{"content":"'"$CERTBOT_VALIDATION"'"}]}]}'

STATUS_CODE="$(
  curl -sS -o "$RESPONSE_FILE" -w "%{http_code}" \
    -X PUT "$API_BASE/$ZONE_DOMAIN" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    --data "$PAYLOAD"
)"

if [ "$STATUS_CODE" -lt 200 ] || [ "$STATUS_CODE" -ge 300 ]; then
  echo "Hostinger DNS API update failed with status $STATUS_CODE" >&2
  cat "$RESPONSE_FILE" >&2 || true
  exit 1
fi

sleep "$PROPAGATION_SECONDS"


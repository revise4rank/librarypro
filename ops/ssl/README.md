# BookLib wildcard SSL renewal

`booklib-wildcard` uses a DNS-01 challenge so every owner subdomain under `*.booklib.in` is covered.

To make renewal non-interactive on the VPS, create a Hostinger API token with DNS zone access for `booklib.in`, then run:

```sh
cd /opt/booklib/app/ops/ssl
HOSTINGER_API_TOKEN="paste-token-here" ./install-hostinger-wildcard-renewal.sh
certbot renew --cert-name booklib-wildcard --dry-run
```

The installer stores the token at `/root/.secrets/booklib/hostinger-api-token`, installs Certbot manual DNS hooks, updates `/etc/letsencrypt/renewal/booklib-wildcard.conf`, and reloads Nginx after successful renewals.


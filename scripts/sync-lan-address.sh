#!/usr/bin/env bash
set -euo pipefail
umask 077

atlas_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
identity_dir="${atlas_dir}/../identity"
nexops_dir="/home/localhost/nexops"
lan_ip="${ATLAS_LAN_IP:-$(ip route get 1.1.1.1 | awk '{ for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit } }')}"

if [[ ! "${lan_ip}" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  printf 'Alamat IPv4 LAN tidak dapat dideteksi.\n' >&2
  exit 1
fi

replace_env() {
  local file="$1" key="$2" value="$3" temporary
  temporary="$(mktemp)"
  awk -v key="${key}" -v value="${value}" '
    BEGIN { replaced = 0 }
    $0 ~ "^" key "=" { print key "=\"" value "\""; replaced = 1; next }
    { print }
    END { if (!replaced) print key "=\"" value "\"" }
  ' "${file}" > "${temporary}"
  mv "${temporary}" "${file}"
  chmod 600 "${file}"
}

replace_env "${atlas_dir}/.env" NEXT_PUBLIC_APP_URL "https://${lan_ip}"
replace_env "${atlas_dir}/.env.local" NEXTAUTH_URL "https://${lan_ip}"
replace_env "${atlas_dir}/.env.local" OIDC_ISSUER "http://${lan_ip}:8080/realms/atlas"
replace_env "${atlas_dir}/.env.local" NEXTCLOUD_URL "http://${lan_ip}:8081"
replace_env "${identity_dir}/.env" IDENTITY_HOST "${lan_ip}"
replace_env "${nexops_dir}/.env" NEXTCLOUD_TRUSTED_DOMAINS "localhost 127.0.0.1 ${lan_ip}"
replace_env "${nexops_dir}/.env" URL_LAN "http://${lan_ip}:8081"

set -a
# shellcheck disable=SC1091
source "${identity_dir}/.env"
set +a

identity_compose=(docker compose --project-directory "${identity_dir}" -f "${identity_dir}/docker-compose.yml")
nexops_compose=(docker compose --project-directory "${nexops_dir}" -f "${nexops_dir}/docker-compose.yml")
atlas_compose=(docker compose --project-directory "${atlas_dir}" -f "${atlas_dir}/docker-compose.yml")

expected_identity_origin="http://${lan_ip}:${KEYCLOAK_PORT:-8080}"
active_identity_origin="$("${identity_compose[@]}" exec -T keycloak printenv KC_HOSTNAME 2>/dev/null || true)"
if [[ "${active_identity_origin}" != "${expected_identity_origin}" ]]; then
  "${identity_compose[@]}" up -d --force-recreate keycloak
else
  "${identity_compose[@]}" up -d
fi
"${nexops_compose[@]}" up -d

discovery_url="${expected_identity_origin}/realms/atlas/.well-known/openid-configuration"
discovery_issuer=""
for _ in {1..60}; do
  discovery_issuer="$(curl --max-time 3 -fsS "${discovery_url}" 2>/dev/null | jq -r '.issuer // empty' 2>/dev/null || true)"
  [[ "${discovery_issuer}" == "${expected_identity_origin}/realms/atlas" ]] && break
  sleep 2
done
if [[ "${discovery_issuer}" != "${expected_identity_origin}/realms/atlas" ]]; then
  printf 'Keycloak tidak siap atau masih mengumumkan issuer yang salah: %s\n' "${discovery_issuer:-tidak tersedia}" >&2
  exit 1
fi

nextcloud_ready=false
for _ in {1..60}; do
  if "${nexops_compose[@]}" exec -T --user www-data app php occ status --output=json >/dev/null 2>&1; then
    nextcloud_ready=true
    break
  fi
  sleep 2
done
if [[ "${nextcloud_ready}" != true ]]; then
  printf 'Nextcloud tidak siap menerima pembaruan konfigurasi.\n' >&2
  exit 1
fi

"${identity_compose[@]}" exec -T keycloak /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}" >/dev/null
atlas_client_id="$("${identity_compose[@]}" exec -T keycloak /opt/keycloak/bin/kcadm.sh get clients -r atlas -q clientId=atlas --fields id --format csv --noquotes | tr -d '\r')"
nextcloud_client_id="$("${identity_compose[@]}" exec -T keycloak /opt/keycloak/bin/kcadm.sh get clients -r atlas -q clientId=nextcloud --fields id --format csv --noquotes | tr -d '\r')"
"${identity_compose[@]}" exec -T keycloak /opt/keycloak/bin/kcadm.sh update "clients/${atlas_client_id}" -r atlas \
  -s "redirectUris=[\"https://${lan_ip}/api/auth/callback/oidc\"]" -s "webOrigins=[\"https://${lan_ip}\"]"
"${identity_compose[@]}" exec -T keycloak /opt/keycloak/bin/kcadm.sh update "clients/${nextcloud_client_id}" -r atlas \
  -s "redirectUris=[\"http://localhost:8081/apps/user_oidc/code\",\"http://localhost:8081/index.php/apps/user_oidc/code\",\"http://127.0.0.1:8081/apps/user_oidc/code\",\"http://127.0.0.1:8081/index.php/apps/user_oidc/code\",\"http://${lan_ip}:8081/apps/user_oidc/code\",\"http://${lan_ip}:8081/index.php/apps/user_oidc/code\"]" \
  -s "webOrigins=[\"http://localhost:8081\",\"http://127.0.0.1:8081\",\"http://${lan_ip}:8081\"]"
"${nexops_compose[@]}" exec -T --user www-data app php occ user_oidc:provider atlas \
  --clientid=nextcloud --clientsecret="${NEXTCLOUD_OIDC_CLIENT_SECRET}" \
  --discoveryuri="http://${lan_ip}:8080/realms/atlas/.well-known/openid-configuration" \
  --scope='openid email profile' --unique-uid=1 --check-bearer=0 --bearer-provisioning=0 \
  --group-provisioning=1 --group-whitelist-regex='^/nextcloud/.*$' \
  --group-restrict-login-to-whitelist=1 --mapping-groups=groups --no-interaction >/dev/null

mapfile -t trusted_domains < <("${nexops_compose[@]}" exec -T --user www-data app php occ config:system:get trusted_domains)
if ! printf '%s\n' "${trusted_domains[@]}" | grep -Fxq "${lan_ip}"; then
  "${nexops_compose[@]}" exec -T --user www-data app php occ config:system:set trusted_domains \
    "${#trusted_domains[@]}" --value="${lan_ip}" >/dev/null
fi

ATLAS_LAN_IP="${lan_ip}" "${atlas_dir}/scripts/generate-local-tls.sh"
"${atlas_compose[@]}" up -d --build
# Nginx keeps the certificate in memory, so an explicit restart is required
# even though the renewed files are bind-mounted into the container.
"${atlas_compose[@]}" restart proxy
printf 'ATLAS, Keycloak, dan Nextcloud disinkronkan ke %s dan siap digunakan.\n' "${lan_ip}"

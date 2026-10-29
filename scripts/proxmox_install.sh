#!/bin/bash
# TheHive MCP Proxmox LXC Installer
# Creates an LXC container on Proxmox VE with TheHive MCP
# MCP server for TheHive incident response

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  TheHive MCP - Proxmox LXC Installer${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Reviewed source
# The operator supplies the exact reviewed commit. Branches and tags are rejected.
if [[ ! "${THEHIVE_SOURCE_COMMIT:-}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    printf '%s\n' 'Error: THEHIVE_SOURCE_COMMIT must be a reviewed 40-character hexadecimal commit.' >&2
    exit 1
fi
THEHIVE_SOURCE_COMMIT=${THEHIVE_SOURCE_COMMIT,,}

# Pre-flight
if [ ! -f /etc/pve/.version ]; then
    echo -e "${RED}Error: Must be run on a Proxmox VE host.${NC}"; exit 1
fi
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root${NC}"; exit 1
fi

# Container settings
NEXT_CTID=$(pvesh get /cluster/nextid 2>/dev/null || echo "100")
echo -e "${CYAN}Press Enter for defaults.${NC}"
echo ""

read -p "Container ID [$NEXT_CTID]: " CTID; CTID=${CTID:-$NEXT_CTID}
if pct status "$CTID" &>/dev/null; then
    echo -e "${RED}Error: CT $CTID exists.${NC}"; exit 1
fi

read -p "Hostname [thehive-mcp]: " CT_HOSTNAME; CT_HOSTNAME=${CT_HOSTNAME:-thehive-mcp}
read -p "Memory MB [2048]: " CT_MEMORY; CT_MEMORY=${CT_MEMORY:-2048}
read -p "Disk GB [4]: " CT_DISK; CT_DISK=${CT_DISK:-4}
read -p "CPU cores [1]: " CT_CORES; CT_CORES=${CT_CORES:-1}

# Network
echo ""; echo -e "${YELLOW}Network${NC}"
read -p "Bridge [vmbr0]: " CT_BRIDGE; CT_BRIDGE=${CT_BRIDGE:-vmbr0}
read -p "DHCP? [Y/n]: " USE_DHCP; USE_DHCP=${USE_DHCP:-Y}
NET_CONFIG="name=eth0,bridge=$CT_BRIDGE"
if [[ "${USE_DHCP,,}" == "n" ]]; then
    read -p "IP (CIDR): " CT_IP; read -p "Gateway: " CT_GW
    NET_CONFIG="$NET_CONFIG,ip=$CT_IP,gw=$CT_GW"
else
    NET_CONFIG="$NET_CONFIG,ip=dhcp"
fi

read -p "Storage [local-lvm]: " CT_STORAGE; CT_STORAGE=${CT_STORAGE:-local-lvm}

# Service config
echo ""; echo -e "${YELLOW}TheHive MCP Configuration${NC}"
read -p "THEHIVE_URL: " THEHIVE_URL_VAL
read -rsp "THEHIVE_API_KEY: " THEHIVE_API_KEY_VAL; echo ""
read -p "Port [3104]: " MCP_PORT; MCP_PORT=${MCP_PORT:-3104}
if [[ "$THEHIVE_URL_VAL" == *$'\n'* || "$THEHIVE_API_KEY_VAL" == *$'\n'* ]]; then
    echo -e "${RED}Error: THEHIVE_URL and THEHIVE_API_KEY must be single-line values.${NC}"; exit 1
fi

# Template
echo -e "${YELLOW}Finding Ubuntu template...${NC}"
DOWNLOADED=$(pveam list local 2>/dev/null | grep -i ubuntu | grep -i "24.04\|22.04" | awk '{print $1}' | head -1)
if [ -n "$DOWNLOADED" ]; then
    TEMPLATE="$DOWNLOADED"
else
    TNAME=$(pveam available | grep -i "ubuntu-24.04-standard" | awk '{print $2}' | head -1)
    [ -z "$TNAME" ] && TNAME=$(pveam available | grep -i "ubuntu-22.04-standard" | awk '{print $2}' | head -1)
    [ -z "$TNAME" ] && { echo -e "${RED}No Ubuntu template found.${NC}"; exit 1; }
    pveam download local "$TNAME"
    TEMPLATE="local:vztmpl/$TNAME"
fi

# Create container
echo -e "${YELLOW}Creating container $CTID...${NC}"
CT_PASSWORD=$(openssl rand -base64 12)
pct create "$CTID" "$TEMPLATE" \
    --hostname "$CT_HOSTNAME" --memory "$CT_MEMORY" --cores "$CT_CORES" \
    --rootfs "$CT_STORAGE:$CT_DISK" --net0 "$NET_CONFIG" \
    --unprivileged 1 --features nesting=1 --password "$CT_PASSWORD" --start 0

# Start and wait for network
pct start "$CTID"; sleep 10
for i in {1..30}; do
    pct exec "$CTID" -- ping -c1 8.8.8.8 &>/dev/null && break; sleep 2
done

# Install deps
echo -e "${YELLOW}Installing dependencies...${NC}"
pct exec "$CTID" -- bash -c "apt-get update && apt-get install -y curl git ca-certificates gnupg"
pct exec "$CTID" -- bash -c "mkdir -p /etc/apt/keyrings && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg"
pct exec "$CTID" -- bash -c "echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main' > /etc/apt/sources.list.d/nodesource.list"
pct exec "$CTID" -- bash -c "apt-get update && apt-get install -y nodejs"

# Fetch reviewed source
echo -e "${YELLOW}Setting up TheHive MCP...${NC}"
pct exec "$CTID" -- env SOURCE_COMMIT="$THEHIVE_SOURCE_COMMIT" bash -ceu '
git init /opt/thehive-mcp
cd /opt/thehive-mcp
git remote add origin https://github.com/lidless-labs/thehive-mcp.git
git fetch --depth 1 origin "$SOURCE_COMMIT"
git checkout --detach FETCH_HEAD
ACTUAL_COMMIT=$(git rev-parse --verify HEAD^{commit})
if [ "$ACTUAL_COMMIT" != "$SOURCE_COMMIT" ]; then
    printf "%s\n" "Source commit verification failed. Stopping before dependency installation." >&2
    exit 1
fi
npm ci
npm run build
npm prune --omit=dev
'

# Configure service
pct exec "$CTID" -- env THEHIVE_URL_VAL="$THEHIVE_URL_VAL" THEHIVE_API_KEY_VAL="$THEHIVE_API_KEY_VAL" MCP_PORT="$MCP_PORT" bash -c '
umask 077
{
  printf "THEHIVE_URL=%s\n" "$THEHIVE_URL_VAL"
  printf "THEHIVE_API_KEY=%s\n" "$THEHIVE_API_KEY_VAL"
  printf "PORT=%s\n" "$MCP_PORT"
} > /opt/thehive-mcp/.env
'

# Dedicated service identity. The code and environment file remain root-owned.
pct exec "$CTID" -- bash -c "id -u thehive-mcp >/dev/null 2>&1 || useradd --system --user-group --home-dir /var/lib/thehive-mcp --shell /usr/sbin/nologin thehive-mcp"
pct exec "$CTID" -- bash -c "chown -R root:root /opt/thehive-mcp && chmod -R go-w /opt/thehive-mcp && chmod 600 /opt/thehive-mcp/.env"

# Systemd service
pct exec "$CTID" -- bash -c "cat > /etc/systemd/system/thehive-mcp.service << 'SVCEOF'
[Unit]
Description=TheHive MCP
After=network.target

[Service]
Type=simple
User=thehive-mcp
Group=thehive-mcp
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
RestrictRealtime=true
LockPersonality=true
CapabilityBoundingSet=
AmbientCapabilities=
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
StateDirectory=thehive-mcp
StateDirectoryMode=0700
CacheDirectory=thehive-mcp
CacheDirectoryMode=0700
RuntimeDirectory=thehive-mcp
RuntimeDirectoryMode=0700
Environment=HOME=/var/lib/thehive-mcp
Environment=XDG_CACHE_HOME=/var/cache/thehive-mcp
WorkingDirectory=/opt/thehive-mcp
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/opt/thehive-mcp/.env

[Install]
WantedBy=multi-user.target
SVCEOF"
pct exec "$CTID" -- bash -c "systemctl daemon-reload && systemctl enable thehive-mcp && systemctl start thehive-mcp"

CT_IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  TheHive MCP installed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "  CT ID:     $CTID"
echo -e "  Hostname:  $CT_HOSTNAME"
echo -e "  IP:        $CT_IP"
echo -e "  Password:  $CT_PASSWORD"
echo -e "  Port:      $MCP_PORT"
echo ""
echo -e "  ${YELLOW}pct enter $CTID${NC}"
echo -e "  ${YELLOW}pct exec $CTID -- journalctl -u thehive-mcp -f${NC}"

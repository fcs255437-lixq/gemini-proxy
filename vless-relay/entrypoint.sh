#!/bin/sh
set -e
PORT="${PORT:-10000}"
sed -e "s/__PORT__/${PORT}/" \
    -e "s/__INBOUND_UUID__/${INBOUND_UUID}/" \
    -e "s|__INBOUND_PATH__|${INBOUND_PATH}|" \
    -e "s/__UP_UUID__/${UP_UUID}/" \
    /usr/local/xray/config.template.json > /usr/local/xray/config.json
exec /usr/local/xray/xray run -config /usr/local/xray/config.json

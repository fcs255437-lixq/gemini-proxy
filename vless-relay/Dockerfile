FROM alpine:3.20
RUN apk add --no-cache curl unzip ca-certificates && \
    curl -fsSL -o /tmp/xray.zip https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip && \
    unzip -o /tmp/xray.zip -d /usr/local/xray && \
    chmod +x /usr/local/xray/xray && \
    rm /tmp/xray.zip
COPY config.template.json /usr/local/xray/config.template.json
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

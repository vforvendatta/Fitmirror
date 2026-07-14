# PocketBase image for FitMirror — bundles the binary + setup script.
FROM alpine:latest
RUN apk add --no-cache ca-certificates wget unzip
WORKDIR /pocketbase
# Download PocketBase binary
ARG PB_VERSION=0.23.0
RUN wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
    && unzip /tmp/pb.zip -d /pocketbase \
    && chmod +x /pocketbase/pocketbase \
    && rm /tmp/pb.zip
COPY setup.mjs /setup.mjs
RUN mkdir -p /pb_data
EXPOSE 8090
CMD ["/pocketbase/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data"]

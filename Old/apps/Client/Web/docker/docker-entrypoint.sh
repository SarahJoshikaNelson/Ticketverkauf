#!/bin/bash

# sed -i "s|FETCH_URI_PLACEHOLDER|$FETCH_URI|g" /usr/share/nginx/html/assets/config.json

echo "{ \"fetchUri\": \"$FETCH_URI\" }" > /usr/share/nginx/html/assets/config.json

exec "$@"
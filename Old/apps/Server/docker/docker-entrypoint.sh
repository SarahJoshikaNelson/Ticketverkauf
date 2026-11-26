#!/bin/bash

# sed -i "s|FETCH_URI_PLACEHOLDER|$FETCH_URI|g" /usr/share/nginx/html/assets/config.json

sed -i "s/TEMPLATE_ADMIN_NAME/$ADMIN_ROOT_NAME/g" ./interface/src/main/resources/import.sql

sed -i "s/TEMPLATE_ADMIN/$ADMIN_ROOT/g" ./interface/src/main/resources/import.sql

exec "$@"

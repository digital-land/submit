# SCENARIO: Successfully submit a 'tree' dataset URL via check tool deep link. This should trigger the
# geometry type selection page.

GET {{ app_host }}/check/link
[QueryStringParams]
dataset: tree
orgName: Some Organisation
HTTP 302
[Captures]
session-id: cookie "connect.sid"
geometry-type-location: header "Location"

GET {{ app_host }}{{ geometry-type-location }}
[Cookies]
connect.sid: {{ session-id }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "Is your geometry data given as points or polygons"

POST {{ app_host }}{{ geometry-type-location }}
[Cookies]
connect.sid: {{ session-id }}
[FormParams]
geomType: point
# alternatively, geomType: polygon
HTTP 302
[Captures]
upload-method-location: header "Location"

GET {{ app_host }}{{ upload-method-location }}
[Cookies]
connect.sid: {{ session-id }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "How do you want to provide your data"

POST {{ app_host }}{{ upload-method-location }}
[Cookies]
connect.sid: {{ session-id }}
[FormParams]
upload-method: url
HTTP 302
[Captures]
upload-url: url

POST {{ app_host }}/check/url
[Cookies]
connect.sid: {{session-id}}
[FormParams]
url: https://gist.githubusercontent.com/rosado/3994e2420857d5c6b0e3bd8dc1488aa1/raw/bf1b52316f66a480a6d116c993ffd57d119094f9/geox-geoy-example.csv
HTTP 302
[Captures]
status-url: header "Location"

GET {{ app_host }}{{ status-url }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "Status"


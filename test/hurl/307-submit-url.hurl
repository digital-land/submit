GET {{ app_host }}/check/link
[QueryStringParams]
dataset: conservation-area
orgName: Some Organisation
HTTP 302
[Captures]
session-id: cookie "connect.sid"
upload-method-location: header "Location"

GET {{ app_host }}{{ upload-method-location }}
[Cookies]
connect.sid: {{ session-id }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "How do you want to provide your data"
xpath "string(/html/body/div[2]/main/div/div/form/span)" contains "Conservation area dataset"

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
connect.sid: {{ session-id }}
[FormParams]
url: https://gist.githubusercontent.com/rosado/3994e2420857d5c6b0e3bd8dc1488aa1/raw/bf1b52316f66a480a6d116c993ffd57d119094f9/geox-geoy-example.csv
HTTP 302
[Captures]
status-url: header "Location"

GET {{ app_host }}{{ status-url }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "Status"

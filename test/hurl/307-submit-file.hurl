# SCENARIO: Successfully submit a dataset by uploading a file via check tool deep link .

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

POST {{ app_host }}{{ upload-method-location }}
[Cookies]
connect.sid: {{ session-id }}
[FormParams]
upload-method: file
HTTP 302
[Captures]
upload-url: header "Location"

GET {{ app_host }}{{ upload-url }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "Upload data"

POST {{ app_host }}{{ upload-url }}
[Cookies]
connect.sid: {{ session-id }}
[MultipartFormData]
datafile: file,common/geox-geoy-example.csv;
HTTP 302
[Captures]
status-url: header "Location"

GET {{ app_host }}{{ status-url }}
[Cookies]
connect.sid: {{ session-id }}
HTTP 200
[Asserts]
xpath "string(/html/head/title)" contains "Status"

# SCENARIO: Enter the check tool via deep link, go forward and then back go
# back to the dataset selection page using the navigation links.

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

GET {{ app_host }}/check/dataset
[Cookies]
connect.sid: {{ session-id }}
HTTP 200

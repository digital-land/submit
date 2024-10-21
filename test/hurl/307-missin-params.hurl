# accessing the route without required params should return an error
GET {{ app_host }}/check/link
HTTP 302
[Asserts]
header "Location" == "/check"

GET {{ app_host }}/check/link?dataset=foo
HTTP 302
[Asserts]
header "Location" == "/check"
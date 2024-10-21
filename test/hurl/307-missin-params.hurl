# SCENARIO: Enter the check tool via deep link, but without required params. This should
# redirect us to the check tool start page.

GET {{ app_host }}/check/link
HTTP 302
[Asserts]
header "Location" == "/check"

GET {{ app_host }}/check/link?dataset=foo
HTTP 302
[Asserts]
header "Location" == "/check"

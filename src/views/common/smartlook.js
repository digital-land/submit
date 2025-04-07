window.smartlook || (function (d) {
  var o = smartlook = function () { o.api.push(arguments) }; const h = d.getElementsByTagName('head')[0]
  const c = d.createElement('script'); o.api = new Array(); c.async = true; c.type = 'text/javascript'
  c.charset = 'utf-8'; c.src = 'https://web-sdk.smartlook.com/recorder.js'; h.appendChild(c)
})(document)

smartlook("init", "{{ smartlookKey }}", {
  region: "{{ smartlookRegion }}",
  forms: true,
  numbers: true,
  emails: false,
  ips: false,
});

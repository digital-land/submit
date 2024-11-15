window.dataLayer = window.dataLayer || []

function gtag () {
  window.dataLayer.push(arguments)
}

const allowCookie = window.document.cookie
  .split('; ')
  .find(row => row.startsWith('cookies_preferences_set'))
  ?.split('=')?.[1]

if (allowCookie === 'true') {
  gtag('js', new Date())
  gtag('config', '{{ googleAnalyticsMeasurementId }}')
}

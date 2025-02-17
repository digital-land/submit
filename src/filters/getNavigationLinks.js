const navigationLinks = {
  organisations: {
    href: '/organisations',
    text: 'Find your organisation'
  },
  guidance: {
    href: '/guidance',
    text: 'Guidance'
  }
}

/**
 * Returns navigation links based on the provided page names and current URL.
 *
 * @param {string} currentUrl - The current URL.
 * @param {string[]} links - An array of page names for the links.
 * @returns {object[]} An array of navigation link objects.
 */
export function getNavigationLinks(currentUrl, links) {
  // Filter the navigationLinks object based on the provided links array
  return links
    .map(link => {
      const navLink = navigationLinks[link]
      if (navLink) {
        return {
          ...navLink,
          active: currentUrl === navLink.href
        }
      } else {
        return undefined
      }
    })
    .filter(link => link !== undefined)
}

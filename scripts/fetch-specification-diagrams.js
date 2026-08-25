#!/usr/bin/env node
/**
 * Downloads the relationship diagrams used by the issue guidance from the specification repo.
 *
 * Run as part of `npm run build`, after the static assets have been copied into public/, so the
 * freshly downloaded diagrams win over the baselines committed in src/assets/static. If a download
 * fails we warn and leave the baseline in place rather than failing the build - a GitHub outage
 * must not block a deploy.
 *
 * Usage:
 *   node scripts/fetch-specification-diagrams.js [--out <dir>]
 *
 * The default output directory is public/static/images/diagrams. Pass --out to refresh the
 * committed baselines instead (see the `diagrams:update` npm script).
 */
import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import axios from 'axios'
import { diagramSlugs, diagramsPath } from '../src/content/associatedEntityDiagrams.js'

const DEFAULT_OUT_DIR = path.join('public', diagramsPath)
const REQUEST_TIMEOUT = 15000

/**
 * Reads the diagram base URL straight from config/default.yaml rather than through config/index.js,
 * which validates the whole environment-specific config and is not available during a build.
 *
 * @returns {string}
 */
export const readBaseUrl = (configPath = 'config/default.yaml') => {
  const defaults = yaml.load(fs.readFileSync(configPath, 'utf8'))
  const baseUrl = defaults?.specificationDiagrams?.baseUrl
  if (!baseUrl) {
    throw new Error(`specificationDiagrams.baseUrl is not set in ${configPath}`)
  }
  return baseUrl.replace(/\/+$/, '')
}

export const parseArgs = (argv) => {
  const outIndex = argv.indexOf('--out')
  if (outIndex === -1) return { outDir: DEFAULT_OUT_DIR }

  const outDir = argv[outIndex + 1]
  if (!outDir) throw new Error('--out requires a directory')
  return { outDir }
}

/**
 * Fetches a single diagram. Resolves to the SVG source, or throws if the response doesn't look
 * like an SVG - a 404 from raw.githubusercontent is an HTML page, and writing that out would
 * leave a broken image in the guidance.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
export const fetchDiagram = async (url) => {
  const response = await axios.get(url, { timeout: REQUEST_TIMEOUT, responseType: 'text' })
  const contentType = response.headers['content-type'] ?? ''

  if (!contentType.includes('image/svg+xml')) {
    throw new Error(`expected image/svg+xml but got '${contentType}'`)
  }
  if (typeof response.data !== 'string' || !response.data.includes('<svg')) {
    throw new Error('response body is not an SVG document')
  }

  return response.data
}

/**
 * @param {{ outDir: string }} options
 * @returns {Promise<{ downloaded: string[], failed: string[] }>}
 */
export const fetchSpecificationDiagrams = async ({ outDir }) => {
  const baseUrl = readBaseUrl()
  fs.mkdirSync(outDir, { recursive: true })

  const downloaded = []
  const failed = []

  const results = await Promise.allSettled(
    diagramSlugs().map(async (slug) => {
      const svg = await fetchDiagram(`${baseUrl}/${slug}/diagram.svg`)
      fs.writeFileSync(path.join(outDir, `${slug}.svg`), svg)
      return slug
    })
  )

  results.forEach((result, index) => {
    const slug = diagramSlugs()[index]
    if (result.status === 'fulfilled') {
      downloaded.push(slug)
    } else {
      failed.push(slug)
      const target = path.join(outDir, `${slug}.svg`)
      const hasBaseline = fs.existsSync(target)
      console.warn(
        `fetch-specification-diagrams: could not download '${slug}' (${result.reason.message}). ` +
        (hasBaseline ? 'Keeping the existing copy.' : 'No existing copy - the diagram will be missing.')
      )
    }
  })

  return { downloaded, failed }
}

// Only run when invoked directly, so the functions above stay unit testable.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { outDir } = parseArgs(process.argv.slice(2))
  const { downloaded, failed } = await fetchSpecificationDiagrams({ outDir })
  console.log(
    `fetch-specification-diagrams: wrote ${downloaded.length} diagram(s) to ${outDir}` +
    (failed.length ? `, ${failed.length} failed` : '')
  )
}

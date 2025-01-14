/**
 * @file Type definitions for data coming out of digital-land datasette instance.
 */

/**
 * @typedef Source
 * @property {string} endpoint
 * @property {string} endpoint_url
 * @property {number | null} status
 * @property {string} exception
 * @property {string} latest_log_entry_date
 * @property {string} resource_start_date
 * @property {string} documentation_url
 */

/**
 * @typedef OrgInfo
 * @property {string} name Full name of the organisation
 * @property {string} organisation
 */

/**
 * @typedef DatasetInfo
 * @property {string} name Full name of the dataset
 * @property {string} dataset Short name of the dataset (aka 'slug')
 */

/**
 * @typedef Issue
 * @property {string} status
 * @property {string} issue_type
 * @property {string} field
 */

/**
 * @typedef {string} EFMountOption
 * @typedef {{BEFORE: EFMountOption, AFTER: EFMountOption, APPEND: EFMountOption, REPLACE: EFMountOption}} EFMountConfig
 */

/**
 * @type {EFMountConfig}
 */
const mountOptions = {
	BEFORE: 'before',
	AFTER: 'after',
	APPEND: 'append',
	REPLACE: 'replace'
}

export default mountOptions

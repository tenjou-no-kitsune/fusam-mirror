/**
 * @param {any} settings
 * @returns {settings is import("./types/fusam.js").FUSAMSettings}
 */
export function isSettingsV1(settings) {
	return "enabledDistributions" in settings
}

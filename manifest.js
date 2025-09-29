/**
 *     FUSAM
 *  Copyright (C) 2023  Sid
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { BaseURL } from "./config.js"

/**
 * @typedef {'cheats' | 'enhancements' | 'expansion' | 'automation'} Tag
 */

/**
 * @typedef {Object} Manifest
 * @property {string} version - Version of the manifest
 * @property {ManifestEntry[]} addons - List of available addons
 */

/**
 * @typedef {Object} ManifestEntry
 * @property {string} id - Short name of the addon, alphanumeric, no spaces
 * @property {string} name - Full name of the addon
 * @property {string} description - Short description of the addon
 * @property {string} author - Name of the addon author
 * @property {string} [icon] - URL of the addon icon
 * @property {string} [discord] - Invite to addons Discord
 * @property {string} [repository] - URL of the addon repository
 * @property {Tag[]} tags - Tags of the addon
 * @property {'eval' | 'module' | 'script'} type - Type of the addon
 * @property {boolean} [noCacheBusting] - disables cache busting
 * @property {string} [website] - URL of the addon website
 * @property {ManifestVersion[]} versions - Version of the addon
 */

/**
 * @typedef {Object} ManifestVersion
 * @property {'stable' | 'beta' | 'dev'} distribution - URL of the addon distribution
 * @property {string} source - URL of the addon source entrypoint or eval source
 */

/** @type Manifest */
let manifest = {
	version: "",
	addons: [],
}

export async function updateManifest() {
	// TODO: Consider making this set user-configurable
	const pinnedAddonIDs = new Set(["WCE", "BCX"])
	const response = await fetch(BaseURL + "manifest.json?v=" + Date.now())
	manifest = /** @type {Manifest} */ (await response.json())
	manifest.addons.sort((a, b) => {
		const aPinned = pinnedAddonIDs.has(a.id)
		const bPinned = pinnedAddonIDs.has(b.id)
		if (aPinned === bPinned) {
			return a.name.localeCompare(b.name)
		} else {
			return aPinned ? -1 : 1
		}
	})
	try {
		const url = new URL(window.location.href)
		const fusamParam = url.searchParams.get("fusam")
		if (fusamParam && /^https?:\/\/localhost[:/]/.test(fusamParam)) {
			manifest.addons.unshift({
				id: "localdev",
				name: "Local Development",
				description: "Local development addon",
				author: "You",
				tags: [],
				type: getType(url.searchParams),
				versions: [
					{
						distribution: "dev",
						source: fusamParam,
					},
				],
			})
		}
	} catch (e) {
		// ignore
	}
}

/**
 * @param {URLSearchParams} searchParams
 */
function getType(searchParams) {
	switch (searchParams.get("fusamType")) {
		case "eval":
			return "eval"
		case "script":
			return "script"
		default:
			return "module"
	}
}

export async function getManifest() {
	if (manifest.version === "") await updateManifest()
	return manifest
}

export function getAddon(id) {
	return manifest.addons.find((addon) => addon.id === id)
}

export function getAddonVersion(id, distribution) {
	const addon = getAddon(id)
	if (!addon) return null
	return addon.versions.find((version) => version.distribution === distribution)
}

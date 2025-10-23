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

import { isSettingsV1 } from "./typeasserts.js"

const storageKey = "fusam.settings"

export function getBrowser() {
	const s = /** @type {import("./types/fusam.js").FUSAMSettings | Record<string, string>} */ (
		JSON.parse(window.localStorage.getItem(storageKey) || "{}") || {}
	)
	// Migration from initial version
	if (isSettingsV1(s)) {
		return s
	}
	return {
		enabledDistributions: s || {},
	}
}

function setBrowser(value) {
	window.localStorage.setItem(storageKey, JSON.stringify(value))
}

const settings = getBrowser()
console.debug("[FUSAM]: Loaded device settings", settings)

export function enableBrowserMod(id, distribution) {
	settings.enabledDistributions[id] = distribution
	saveBrowser()
}

export function disableBrowserMod(id) {
	delete settings.enabledDistributions[id]
	saveBrowser()
}

export function browserDistribution(id) {
	return settings.enabledDistributions[id]
}

function saveBrowser() {
	console.debug("Saving browser settings", settings)
	setBrowser(settings)
}

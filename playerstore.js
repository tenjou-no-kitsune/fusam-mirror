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

import { waitFor } from "./delay.js"
import { getAddon } from "./manifest.js"
import { isSettingsV1 } from "./typeasserts.js"

let loaded = false
/** @type {import("./types/fusam.js").FUSAMSettings} */
let settings = {
	enabledDistributions: {},
}

export function playerSettingsLoaded() {
	return loaded
}

export function getAccount() {
	/** @type {import("./types/fusam.js").FUSAMSettings} */
	let settings = { enabledDistributions: {} }

	if (Player?.ExtensionSettings?.FUSAMSettings) {
		settings = /** @type {import("./types/fusam.js").FUSAMSettings} */ (
			JSON.parse(LZString.decompressFromBase64(Player.ExtensionSettings?.FUSAMSettings))
		)
		loaded = true
	} else if (Player?.OnlineSettings?.FUSAMSettings && !Player?.ExtensionSettings?.FUSAMSettings) {
		settings = /** @type {import("./types/fusam.js").FUSAMSettings} */ (
			JSON.parse(LZString.decompressFromBase64(Player.OnlineSettings?.FUSAMSettings))
		)
		Player.ExtensionSettings.FUSAMSettings = Player.OnlineSettings.FUSAMSettings

		saveAccount();

		delete Player.OnlineSettings?.FUSAMSettings
		ServerAccountUpdate.QueueData({
			OnlineSettings: Player.OnlineSettings,
		})
		loaded = true
	} else if (!Player?.ExtensionSettings?.FUSAMSettings) {
		loaded = true
	}

	// Migration from initial version
	if (isSettingsV1(settings)) {
		return settings
	}

	return {
		enabledDistributions: settings ?? {},
	}
}

export function enableAccountMod(id, distribution) {
	if (getAddon(id).browserOnly) return
	settings.enabledDistributions[id] = distribution
}

export function disableAccountMod(id) {
	delete settings.enabledDistributions[id]
}

export function accountDistribution(id) {
	return settings.enabledDistributions[id]
}

export function saveAccount() {
	console.debug("[FUSAM]: Saving account settings", settings)
	Player.ExtensionSettings.FUSAMSettings = LZString.compressToBase64(JSON.stringify(settings))
	ServerPlayerExtensionSettingsSync("FUSAMSettings")
}

;(async function () {
	await waitFor(() => Player && ServerIsLoggedIn())
	settings = getAccount()
	console.debug("[FUSAM]: Loaded account settings", settings)
})()

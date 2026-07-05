import { sleep, waitFor } from "./delay.js"
import { getFUSAM } from "./fusam.js"
import { disableBrowserMod, enableBrowserMod, getBrowser } from "./localstore.js"
import { getAddon, getAddonVersion, updateManifest } from "./manifest.js"
import { disableAccountMod, getAccount, playerSettingsLoaded, saveAccount } from "./playerstore.js"
import { showAsyncModal } from "./ui.js"

let skipLoading = false
let firstLoad = true

const lastSessionStatusKey = "fusam.lastSessionStatus"
const lastErrorKey = "fusam.lastError"
const lastSessionHadError = localStorage?.getItem?.(lastSessionStatusKey) === "error" || false
setLastSessionStatus("ok")

window.addEventListener("error", (event) => {
	console.error("[FUSAM]: Uncaught error", event)
	setLastError(
		JSON.stringify({
			message: event.message,
			file: event.filename,
			line: event.lineno,
		})
	)
})

/**
 * @param {string} status
 */
function setLastSessionStatus(status) {
	localStorage?.setItem?.(lastSessionStatusKey, status)
}

/**
 * @param {string} error
 */
function setLastError(error) {
	localStorage?.setItem?.(lastErrorKey, error)
	setLastSessionStatus("error")
}

export function getLastError() {
	return localStorage?.getItem?.(lastErrorKey)
}

/**
 * @param {import("./types/fusam.js").FUSAMAddonState['status']} status
 */
function getLoadedAddonsByStatus(status) {
	return Object.entries(getFUSAM().addons)
		.filter(([_, state]) => state.status === status)
		.map(([id]) => id)
}

/**
 * @param {import("./types/fusam.js").FUSAMSettings} settings
 */
function addonFixup(settings) {
	if (settings.enabledDistributions["ABCL"] === "unstable") {
		settings.enabledDistributions["ABCL"] = "dev"
	}
	if (settings.enabledDistributions["CRABS"]) {
		settings.enabledDistributions["CRABS"] = settings.enabledDistributions["CRABS"].toLowerCase()
	}
}

export async function loadAddons() {
	if (skipLoading) return
	if (lastSessionHadError && firstLoad) {
		firstLoad = false
		const lastError = localStorage?.getItem?.(lastErrorKey)
		console.warn("[FUSAM]: The previous session had an error", lastError)
		const [answer] = await showAsyncModal({
			prompt: "The previous session had an error. Do you want to skip loading addons?",
			buttons: {
				submit: "Yes",
				cancel: "No",
			},
		})
		if (answer === "submit") {
			skipLoading = true
			return
		}
	}
	firstLoad = false
	await updateManifest()

	// Load device addons immediately, then wait for a login to happen
	const browserSettings = getBrowser()
	addonFixup(browserSettings)
	await load(browserSettings.enabledDistributions)

	await waitFor(() => playerSettingsLoaded())
	const accountSettings = getAccount()
	addonFixup(accountSettings)
	await load(accountSettings.enabledDistributions, true)

	const missingAddonsIDs = getLoadedAddonsByStatus("missing")
	let shouldSave = false
	let shouldReload = false
	if (missingAddonsIDs.length) {
		showAsyncModal({
			prompt: `The following addons from your configuration couldn't be found in the manifest, they'll be removed:\n${missingAddonsIDs.join(", ")}`,
			buttons: { submit: "OK" },
		})
		for (const id of missingAddonsIDs) {
			disableAccountMod(id)
			disableBrowserMod(id)
			shouldSave = true
		}
	}
	const browserOnlyAddonsIDs = getLoadedAddonsByStatus("browser-only")
	if (browserOnlyAddonsIDs.length) {
		const res = await showAsyncModal({
			prompt: `The following addons are loaded by your account, but they're marked to only be compatible with a Browser-level load. They'll be moved to the proper level, but you'll have to refresh to fix the issue:\n${browserOnlyAddonsIDs.join(", ")}`,
			buttons: { submit: "Fix and Refresh", ignore: "Ignore" },
		})
		if (res[0] === "submit") {
			for (const id of browserOnlyAddonsIDs) {
				const val = accountSettings.enabledDistributions[id]
				disableAccountMod(id)
				enableBrowserMod(id, val)
			}
			shouldReload = true
		}
	}
	if (shouldSave || shouldReload) {
		saveAccount()
		if (shouldReload) {
			await sleep(4000) // Give some time for the update message to round-trip
			// @ts-expect-error
			window.location = window.location
		}
	}
}

/**
 * @param {Record<string, string>} settings
 * @param {boolean} [accountLoad=false]
 */
async function load(settings, accountLoad = false) {
	const FUSAM = getFUSAM()
	for (const [id, distribution] of Object.entries(settings)) {
		if (id in FUSAM.addons) continue

		FUSAM.addons[id] = {
			distribution,
			status: "loading",
		}

		const addon = getAddon(id)
		if (!addon) continue
		const version = getAddonVersion(id, distribution)
		if (!version) {
			console.warn(`[FUSAM]: Addon ${id} or its distribution ${distribution} not found`)
			FUSAM.addons[id].status = "missing"
			continue
		}
		if (addon.browserOnly && accountLoad) {
			console.warn(`[FUSAM]: Browser-only addon ${id} found in account list`)
			FUSAM.addons[id].status = "browser-only"
			continue
		}
		console.debug(`[FUSAM]: Loading addon ${id} from ${distribution}`)
		;(async () => {
			try {
				addon.load(version)
				FUSAM.addons[id].status ??= "loaded"
			} catch (e) {
				console.error(`[FUSAM]: Failed to load addon ${id}`, e)
				FUSAM.addons[id].status = "error"
				setLastError(`Failed to load addon ${id}: ${e}`)
			}
		})()
	}
}

/**
 * @param {string} url URL of the script
 * @param {'module' | 'text/javascript'} type Type of the script
 * @return {Promise<Event>} [onload] Callback when the script is loaded
 */
export function scriptAddon(url, type) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script")
		script.type = type
		script.crossOrigin = "anonymous"
		script.src = url
		script.onload = (ev) => resolve(ev)
		script.onerror = (err) => reject(err)
		document.head.appendChild(script)
	})
}

/**
 * @param {string} url
 * @param {string} source
 */
export async function evalAddon(url, source) {
	const resp = await fetch(url)
	let data = await resp.text()
	data = data.replace(/sourceMappingURL=.*?.map/u, `sourceMappingURL=${source}.map`)
	eval?.(data)
}

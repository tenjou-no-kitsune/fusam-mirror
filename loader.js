import { waitFor } from "./delay.js"
import { getBrowser } from "./localstore.js"
import { getAddon, getAddonVersion, updateManifest } from "./manifest.js"
import { getAccount, playerSettingsLoaded } from "./playerstore.js"
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

function setLastSessionStatus(status) {
	localStorage?.setItem?.(lastSessionStatusKey, status)
}

function setLastError(error) {
	localStorage?.setItem?.(lastErrorKey, error)
	setLastSessionStatus("error")
}

export function getLastError() {
	return localStorage?.getItem?.(lastErrorKey)
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
	await load(getBrowser().enabledDistributions)

	await waitFor(() => playerSettingsLoaded())
	await load(getAccount().enabledDistributions)
}

/**
 * @param {Record<string, string>} settings
 */
async function load(settings) {
	for (const [id, distribution] of Object.entries(settings)) {
		if (id in window.FUSAM.addons) continue

		window.FUSAM.addons[id] = {
			distribution,
			status: "loading",
		}

		const addon = getAddon(id)
		const version = getAddonVersion(id, distribution)
		if (!version) {
			console.warn(`[FUSAM]: Addon ${id} or its distribution ${distribution} not found`)
			window.FUSAM.addons[id].status = "error"
			continue
		}
		console.debug(`[FUSAM]: Loading addon ${id} from ${distribution}`)
		;(async () => {
			try {
				const URL = version.source + (addon.noCacheBusting ? "" : `?v=${Date.now()}`)
				switch (addon.type) {
					case "eval":
						await evalAddon(URL, version.source)
						window.FUSAM.addons[id].status = "loaded"
						break
					case "module":
						await import(URL)
						window.FUSAM.addons[id].status = "loaded"
						break
					case "script":
						await scriptAddon(URL, "text/javascript")
						window.FUSAM.addons[id].status = "loaded"
						break
				}
			} catch (e) {
				console.error(`[FUSAM]: Failed to load addon ${id}`, e)
				window.FUSAM.addons[id].status = "error"
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
function scriptAddon(url, type) {
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

async function evalAddon(url, source) {
	await fetch(url)
		.then((resp) => resp.text())
		.then((resp) => {
			resp = resp.replace(/sourceMappingURL=.*?.map/u, `sourceMappingURL=${source}.map`)
			eval?.(resp)
		})
}

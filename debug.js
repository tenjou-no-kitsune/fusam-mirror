import { downloadZip } from "./vendor/client-zip.js"
import { getLastError } from "./loader.js"
import { bcModSdk } from "./vendor/bcmodsdk.js"
import { getFUSAM } from "./fusam.js"

/**
 * @type {Map<string, () => string | Promise<string>>}
 */
const debugMethods = new Map()

/**
 * @param {string} name
 * @param {() => string | Promise<string>} callback
 */
export function registerDebugMethod(name, callback) {
	debugMethods.set(name, callback)
}

/**
 * @param {string} [addon]
 */
export async function generateDebugReport(addon) {
	const now = Date.now()
	if (addon) {
		if (debugMethods.has(addon)) {
			const debugBlob = (await debugMethods.get(addon)?.()) ?? ""
			saveBlobAsFile(new Blob([debugBlob]), filename(addon, now))
			return
		}
		console.warn(`[FUSAM]: Addon ${addon} not found`)
		return
	}

	const blobs = []
	for (const [name, method] of debugMethods) {
		const value = await method()
		// saveBlobAsFile(new Blob([value]), filename(name, now))
		blobs.push({
			name: filename(name, now),
			lastModified: new Date(now),
			input: value,
		})
	}
	const blob = await downloadZip(blobs).blob()
	saveBlobAsFile(blob, `FUSAM-debug-${now}.zip`)
}

/**
 * @param {string} addon
 */
export function canDebug(addon) {
	return debugMethods.has(addon)
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
function saveBlobAsFile(blob, filename) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

export function registerFUSAMDebugMethod() {
	registerDebugMethod("FUSAM", () => {
		let d = `Version: LOCAL_FUSAM\n`
		d += `Browser: ${navigator.userAgent}\n`
		d += `Local storage: ${isLocalStorageAvailable() ? "available" : "unavailable"}\n`
		d += `Domain used: ${window.location.host}\n`
		d += `Last error: ${getLastError()}\n`
		d += `FUSAM-enabled addons:\n - ${Object.entries(getFUSAM().addons)
			.map(([addon, ver]) => `${addon}:${JSON.stringify(ver)}`)
			.join("\n - ")}\n`
		d += `SDK-enabled addons:\n - ${bcModSdk
			.getModsInfo()
			.map((m) => `${m.name} @ ${m.version}`)
			.join("\n- ")}`
		return d
	})
}

function isLocalStorageAvailable() {
	var test = "fusam_test"
	try {
		localStorage.setItem(test, test)
		const val = localStorage.getItem(test)
		localStorage.removeItem(test)
		return test === val
	} catch (e) {
		return false
	}
}

/**
 * @param {string} addon
 * @param {number} now
 */
function filename(addon, now) {
	return `${addon}-${now}.txt`
}

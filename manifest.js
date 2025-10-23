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
import { getUserLanguages } from "./ui.js";

const MANIFEST_TAGS = Object.freeze(/** @type {const} */ (['automation', 'cheats', 'enhancements', 'expansion', 'recommended']));

/**
 * @typedef {typeof MANIFEST_TAGS[*]} ManifestTag
 */

class ManifestError extends Error {
	constructor(message) {
		super(message)
		this.name = "ManifestError";
	}
}

export class Manifest {
	/** @type {string} */
	version;
	/** @type {ManifestEntry[]} */
	addons;
	/**
	 *
	 * @param {unknown} data
	 */
	constructor(data) {
		if (!CommonIsObject(data)) throw new ManifestError("Invalid manifest data");
		if (!("version" in data && typeof data.version === "string")) {
			throw new ManifestError("Invalid manifest.version field");
		}
		if (!("addons" in data && Array.isArray(data.addons))) {
			throw new ManifestError("Invalid manifest.addons field");
		}
		this.version = data.version;
		this.addons = data.addons.map(addon => new ManifestEntry(addon));
		this.addons.sort((a, b) => {
			const aPinned = a.tags.includes("recommended")
			const bPinned = b.tags.includes("recommended")
			if (aPinned === bPinned) {
				return a.name.localeCompare(b.name)
			} else {
				return aPinned ? -1 : 1
			}
		})
	}
}

/**
 * @typedef {Object} ManifestVersion
 * @property {'stable' | 'beta' | 'dev'} distribution - URL of the addon distribution
 * @property {string} source - URL of the addon source entrypoint or eval source
 */

/**
 *
 * @param {string} url
 * @returns
 */
function isUrl(url) {
	return url.startsWith("http://") || url.startsWith("https://");
}

export class ManifestEntry {
	/** @type {string} Short name of the addon, alphanumeric, no spaces */
	id;
	/** @type {string | Record<string, string>} Full name of the addon */
	#name;
	/** @type {string | Record<string, string>} Short description of the addon */
	#description;
	/** @type {string} Name of the addon author */
	author;
	/** @type {"eval" | "module" | "script"} Type of the addon */
	type;
	/** @type {ManifestTag[]} Tags of the addon */
	tags;
	/** @type {ManifestVersion[]} Versions of the addon */
	versions;
	/** @type {string | undefined} URL of the addon icon */
	icon;
	/** @type {string | undefined} Invite to addons Discord */
	discord;
	/** @type {string | undefined} URL of the addon repository */
	repository;
	/** @type {string | undefined} URL of the addon website */
	website;
	/** @type {boolean | undefined} disables cache busting */
	noCacheBusting;
	/**
	 *
	 * @param {unknown} data
	 */
	constructor(data) {
		if (!CommonIsObject(data)) throw new ManifestError("Invalid addon data");
		if (!("id" in data && typeof data.id === "string")) {
			throw new ManifestError("Missing addon.id field");
		}
		this.id = data.id;
		if (!("name" in data && (typeof data.name === "string" || CommonIsObject(data.name) && Object.values(data.name).every(v => typeof v === "string")))) {
			throw new ManifestError(`Missing addon.name field for addon: ${data.id}`);
		}
		this.#name = /** @type {ManifestEntry["name"]} */ (data.name);
		if (!("description" in data && (typeof data.description === "string" || CommonIsObject(data.name) && Object.values(data.name).every(v => typeof v === "string")))) {
			throw new ManifestError(`Missing addon.description field for addon: ${data.id}`);
		}
		this.#description = /** @type {ManifestEntry["name"]} */ (data.description);
		if (!("author" in data && typeof data.author === "string")) {
			throw new ManifestError(`Missing addon.author field for addon: ${data.id}`);
		}
		this.author = data.author;
		if (!("type" in data && typeof data.type === "string" && ["eval", "module", "script"].includes(data.type))) {
			throw new ManifestError(`Missing addon.type field for addon: ${data.id}`);
		}
		this.type = /** @type {ManifestEntry["type"]} */ (data.type);
		if (!("tags" in data && Array.isArray(data.tags) && data.tags.every(t => typeof t === "string" && MANIFEST_TAGS.includes(t)))) {
			throw new ManifestError(`Invalid addon.tags field for addon: ${data.id}`);
		}
		this.tags = /** @type {ManifestTag[]} */ (data.tags);
		if (!("versions" in data && Array.isArray(data.versions))) {
			throw new ManifestError(`Invalid addon.versions field for addon: ${data.id}`);
		}
		data.versions.forEach(v => {
			if (!(CommonIsObject(v)))
				throw new ManifestError(`Invalid addon.versions entry for addon: ${data.id}, ${JSON.stringify(v)}`);
			if (!("distribution" in v && typeof v.distribution === "string" && ["stable", "beta", "dev"].includes(v.distribution)))
				throw new ManifestError(`Invalid addon.versions.distribution field for addon: ${data.id}, ${JSON.stringify(v)}`);
			if (!("source" in v && typeof v.source === "string" && isUrl(v.source)))
				throw new ManifestError(`Invalid addon.versions.source field for addon: ${data.id}, ${JSON.stringify(v)}`);
		});
		this.versions = /** @type {ManifestVersion[]} */ (data.versions);
		if ("icon" in data) {
			if (!(typeof data.icon === "string" && isUrl(data.icon))) {
				throw new ManifestError(`Missing addon.icon field for addon: ${data.id}`);
			}
			this.icon = data.icon;
		}
		if ("discord" in data) {
			if (!(typeof data.discord === "string" && isUrl(data.discord))) {
				throw new ManifestError(`Missing addon.discord field for addon: ${data.id}`);
			}
			this.discord = data.discord;
		}
		if ("repository" in data) {
			if (!(typeof data.repository === "string" && isUrl(data.repository))) {
				throw new ManifestError(`Missing addon.repository field for addon: ${data.id}`);
			}
			this.repository = data.repository;
		}
		if ("website" in data) {
			if (!(typeof data.website === "string" && isUrl(data.website))) {
				throw new ManifestError(`Missing addon.website field for addon: ${data.id}`);
			}
			this.website = data.website;
		}
		if ("noCacheBusting" in data) {
			if (!(typeof data.noCacheBusting === "boolean")) {
				throw new ManifestError(`Missing addon.noCacheBusting field for addon: ${data.id}`);
			}
			this.noCacheBusting = data.noCacheBusting;
		}
	}

	get name() {
		if (typeof this.#name === "string") return this.#name;
		for (const lang of getUserLanguages()) {
			if (this.#name[lang]) return this.#name[lang];
		}
		return this.#name["en"];
	}

	get description() {
		if (typeof this.#description === "string") return this.#description;
		for (const lang of getUserLanguages()) {
			if (this.#description[lang]) return this.#description[lang];
		}
		return this.#description["en"];
	}
}

/** @type {Manifest} */
let manifest = undefined;

export async function updateManifest() {
	const response = await fetch(BaseURL + "manifest.json?v=" + Date.now())
	manifest = new Manifest(await response.json());
	try {
		const url = new URL(window.location.href)
		const fusamParam = url.searchParams.get("fusam")
		if (fusamParam && /^https?:\/\/localhost[:/]/.test(fusamParam)) {
			manifest.addons.unshift(new ManifestEntry(
				{
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
				}
			))
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
	if (manifest?.version === "") await updateManifest()
	return manifest
}

export function getAddon(id) {
	return manifest?.addons.find((addon) => addon.id === id)
}

export function getAddonVersion(id, distribution) {
	const addon = getAddon(id)
	if (!addon) return null
	return addon.versions.find((version) => version.distribution === distribution)
}

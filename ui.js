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
import { canDebug, generateDebugReport } from "./debug.js"
import { waitFor } from "./delay.js"
import { loadAddons } from "./loader.js"
import { disableBrowserMod, enableBrowserMod, browserDistribution } from "./localstore.js"
import { getManifest } from "./manifest.js"
import {
	disableAccountMod,
	enableAccountMod,
	accountDistribution,
	playerSettingsLoaded,
	saveAccount,
} from "./playerstore.js"
import { HOOK_PRIORITY, SDK } from "./vendor/bcmodsdk.js"
import { render, signal } from "./vendor/reef.js"

const showButtonId = "fusam-show-button"
const addonManagerId = "fusam-addon-manager-container"
const addonManagerCloseButtonId = "fusam-addon-manager-close"

/**
 * @param {any[]} [args]
 * @param {(...args: any[]) => any} [next]
 */
function showButton(args, next) {
	if (!document.getElementById(showButtonId)) {
		const button = document.createElement("button")
		button.id = showButtonId
		button.classList.add("button", "fusam")
		button.innerText = "Addon Manager"
		button.onclick = showAddonManager
		button.style.position = "absolute"
		document.body.appendChild(button)
	}
	return next ? next(args) : undefined
}

/**
 * @param {any[]} [args]
 * @param {(...args: any[]) => any} [next]
 */
function hideButton(args, next) {
	document.getElementById(showButtonId)?.remove()
	return next ? next(args) : undefined
}

async function showAddonManager() {
	const manager = document.createElement("div")
	manager.id = addonManagerId
	manager.classList.add("fusam")
	document.body.appendChild(manager)

	manager.textContent = "Loading..."

	await drawAddonManager()

	await waitFor(() => !!document.getElementById(addonManagerCloseButtonId))
	const button = document.getElementById(addonManagerCloseButtonId)
	if (button) {
		button.onclick = hideAddonManager
	}

	registerEventListeners()
}

function drawExitButton() {
	return `<button id="${addonManagerCloseButtonId}" class="fusam-icon-button"><img src="${BaseURL}static/assets/exit.svg"></button>`
}

/**
 * @param {MouseEvent} e
 * @this {HTMLElement}
 */
function debugReport(e) {
	e?.preventDefault()
	const addon = this.getAttribute("data-addon")
	if (!addon) return
	console.debug("Generating debug report for", addon)
	generateDebugReport(addon)
}

/**
 * @this {HTMLInputElement}
 * @param {InputEvent} e
 */
async function searchInput(e) {
	const userQuery = this.value.toLocaleLowerCase().trim()
	for (const entry of document.querySelectorAll("#fusam-addons .fusam-addon-container")) {
		const entryName = entry.querySelector("h2")?.textContent.toLocaleLowerCase()
		if (entryName != null) {
			entry.classList.toggle("fusam-hide", userQuery !== "" && !entryName.includes(userQuery))
		}
	}
}

/**
 * Propagate key presses of writable characters to the search input
 * @this {HTMLElement | Document}
 * @param {KeyboardEvent} e
 */
function documentKeyDown(e) {
	if (
		e.ctrlKey ||
		e.altKey ||
		e.metaKey ||
		!(document.activeElement === null || document.activeElement === document.body)
	) {
		return
	}

	checkKey: if (e.key.length === 1) {
		break checkKey
	} else if (e.key === "Backspace" && !e.shiftKey) {
		break checkKey
	} else {
		return
	}

	e.preventDefault()
	e.stopPropagation()

	const searchInput = document.getElementById("fusam-search")
	if (!(searchInput instanceof HTMLInputElement)) {
		return
	}

	if (e.key === "Backspace") {
		searchInput.value = searchInput.value.slice(-1)
	} else {
		searchInput.value += e.key
	}
	searchInput.focus()
	searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length)
	searchInput.dispatchEvent(new InputEvent("input"))
}

/**
 * Propogate copy/paste actions to the search input
 * @this {HTMLElement | Document}
 * @param {ClipboardEvent} e
 */
function documentPaste(e) {
	if (
		!(document.activeElement === null || document.activeElement === document.body) ||
		globalThis.getSelection()?.type === "Range"
	) {
		return
	}

	e.preventDefault()
	e.stopPropagation()

	const content = e.clipboardData?.getData("text")
	if (!content) {
		return
	}

	const searchInput = document.getElementById("fusam-search")
	if (!(searchInput instanceof HTMLInputElement)) {
		return
	}

	searchInput.value = content
	searchInput.focus()
	searchInput.dispatchEvent(new InputEvent("input"))
}

async function drawAddonManager() {
	const manifest = await getManifest()

	const s = /** @type {{ manifest: import("./manifest.js").Manifest }} */ (
		signal({
			manifest,
		})
	)

	render(`#${addonManagerId}`, draw(), { debugReport, searchInput })

	function draw() {
		return `
			<header id="fusam-addon-manager-header">
				<div class="fusam-search-box">
					<input type="search" placeholder="Filter addons" id="fusam-search" oninput="searchInput()" list="fusam-search-list"></input>
					<datalist id="fusam-search-list">
					${s.manifest.addons
						.map((entry) => entry.name)
						.sort()
						.map((value) => `<option value="${value}"></option>`)
						.join("")}
					</datalist>
				</div>
				<h1 class="fusam-title">Addon Manager</h1>
				<div class="fusam-header-buttons" role="group">
					<button onclick="debugReport()" class="fusam-icon-button"><img src="${BaseURL}static/assets/debug.svg"></button>
					${drawExitButton()}
				</div>
			</header>
			<div id="fusam-addon-manager-body">
			<div class="fusam-intro">
					<h3>
						Welcome to the one stop shop for addon installation in BC!
					</h3>
					<p>
						Pick and choose which specific addons you would like to enable (do <em>not</em> enable them all!),
						be it either for your BC <a href="#fusam-glossary-account">account</a> or <a href="#fusam-glossary-browser">browser</a>.
					</p>
					<p>
						A note on security: while addons that are found to be malicious
						will be removed from the Addon Manager, it is still possible for
						some to slip through the cracks.
					</p>
				</div>
				${
					GameVersion.toLowerCase().includes("beta")
						? `<p class="warn">
							Beta versions of the club are generally not supported
							by addons and may cause unexpected behavior, including
							data loss. Use at your own risk.
						</p>`
						: ""
				}
				<menu id="fusam-addons">
				${s.manifest.addons.map((entry) => drawEntry(entry)).join("")}
				</menu>
				<footer class="fusam-attribution">
					<b id="fusam-glossary-label">Glossary:</b>
					<dl aria-labelledby="fusam-glossary-label">
						<dt id="fusam-glossary-account">Account</dt>
						<dd>FUSAM configuration is stored in your BC account and persists across different browsers and devices.</dd>
						<dt id="fusam-glossary-browser">Browser</dt>
						<dd>FUSAM configuration is stored locally and is <em>exclusive</em> to your current combination of web browser, device and BC server (US, EU, Asia, <i>etc.</i>).</dd>
					</dl>
					${drawAttribution()}
				</footer>
			</div>
		`
	}

	/**
	 * @param {import("./manifest.js").ManifestEntry} entry
	 */
	function drawEntry(entry) {
		const device = browserDistribution(entry.id)
		const account = accountDistribution(entry.id)
		const canAccount = playerSettingsLoaded() && !entry.browserOnly
		const accountTooltip = !playerSettingsLoaded()
			? "You need to be logged in"
			: entry.browserOnly
				? "Can only be loaded on Browser"
				: ""
		const debuggable = canDebug(entry.id)
		const useIcons = true

		return `
		<li class="fusam-addon-container">
			<article class="fusam-addon" aria-labelledby="${entry.id}-name">
				<section class="addon-icon">
					<img src="${entry.icon || BaseURL + "static/assets/icon-fallback.svg"}" alt="${entry.name} icon">
				</section>
				<section class="addon-content">
					<h2 class="addon-name" id="${entry.id}-name">${entry.name}</h2>
					<p class="addon-description">${entry.description}</p>
					<div class="addon-authors">
						by ${entry.author}
					</div>
				</section>
				<section class="addon-interactions">
					<div class="addon-left-interactions" role="group">
						<div class="fusam-addon-entry-version-device">
							<label for="${entry.id}-device">Browser</label>
							<select id="${entry.id}-device" data-addon="${entry.id}">
							<option value="none" selected>None</option>
								${entry.versions.map((version) => drawVersionOption(version, device === version.distribution))}
							</select>
						</div>
						<div class="fusam-addon-entry-version-account">
							<label for="${entry.id}-account">Account</label>
							<select id="${entry.id}-account" data-addon="${entry.id}" ${!canAccount ? "disabled" : ""} title="${accountTooltip}">
							<option value="none" selected>None</option>
								${entry.versions.map((version) => drawVersionOption(version, account === version.distribution))}
							</select>
						</div>
					</div>
					<div class="addon-right-interactions" role="group">
						${
							entry.discord
								? `<div><a rel="external" target="_blank" href="${entry.discord}">${useIcons ? `<img src="${BaseURL}static/assets/discord.svg" alt="discord invite">` : "discord"}</a></div>`
								: ""
						}
						${
							entry.website
								? `<div><a rel="external" target="_blank" href="${entry.website}">${useIcons ? `<img src="${BaseURL}static/assets/website.svg" alt="website link">` : "website"}</a></div>`
								: ""
						}
						${
							entry.repository
								? `<div><a rel="external" target="_blank" href="${entry.repository}"> ${useIcons ? `<img src="${BaseURL}static/assets/repository.svg" alt="repository link">` : "repository"}</a></div>`
								: ""
						}
						${
							debuggable
								? `<div><a href="#" onclick="debugReport()" data-addon="${entry.id}">${useIcons ? `<img src="${BaseURL}static/assets/debug.svg" alt="download debug report">` : "download debug report"}</a></div>`
								: ""
						}
					</div>
				</section>
			</article>
			</li>
		`
	}

	/**
	 * @param {import("./manifest.js").ManifestVersion} version
	 * @param {boolean} selected
	 */
	function drawVersionOption(version, selected) {
		return `
			<option value="${version.distribution}" ${selected ? "#selected" : ""}>${version.distribution}</option>
		`
	}
}
function drawAttribution() {
	// use · between attributions
	return `
            <small>
                Git Logo by Jason Long is licensed under the
                <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 3.0 Unported License</a>.
            </small>

	`
}
function registerEventListeners() {
	document.addEventListener("keydown", documentKeyDown)
	document.addEventListener("paste", documentPaste)

	/** @type {HTMLSelectElement[]} */
	const allSelects = Array.from(document.querySelectorAll(".fusam-addon-entry-buttons select"))
	const maxWidth = allSelects.reduce((maxWidth, el) => Math.max(maxWidth, el.clientWidth), 0)
	if (maxWidth !== 0) {
		allSelects.forEach((e) => (e.style.width = `${maxWidth}px`))
	}

	document.querySelectorAll(".fusam-addon-entry-version-device select").forEach((element) => {
		const select = /** @type {HTMLSelectElement} select */ (element)
		const addon = select.getAttribute("data-addon")
		if (!addon) return
		select.onchange = () => {
			const distribution = select.value
			if (distribution === "none") {
				disableBrowserMod(addon)
			} else {
				enableBrowserMod(addon, distribution)
			}
		}
	})

	document.querySelectorAll(".fusam-addon-entry-version-account select").forEach((element) => {
		const select = /** @type {HTMLSelectElement} select */ (element)
		const addon = select.getAttribute("data-addon")
		if (!addon) return
		select.onchange = () => {
			const distribution = select.value
			if (distribution === "none") {
				disableAccountMod(addon)
			} else {
				enableAccountMod(addon, distribution)
			}
		}
	})
}

function hideAddonManager() {
	document.getElementById(addonManagerId)?.remove()
	document.removeEventListener("keydown", documentKeyDown)
	document.removeEventListener("paste", documentPaste)
	if (playerSettingsLoaded()) {
		saveAccount()
	}
	loadAddons()
}

function loadCSS() {
	const stylesheet = document.createElement("link")
	stylesheet.setAttribute("rel", "stylesheet")
	stylesheet.setAttribute("href", BaseURL + "static/fusam.css")
	document.head.appendChild(stylesheet)
}

export function hookUI() {
	loadCSS()

	SDK.hookFunction("LoginLoad", HOOK_PRIORITY.ADD_BEHAVIOR, showButton)
	SDK.hookFunction("PreferenceLoad", HOOK_PRIORITY.ADD_BEHAVIOR, showButton)
	SDK.hookFunction("LoginDoLogin", HOOK_PRIORITY.ADD_BEHAVIOR, hideButton)
	SDK.hookFunction("LoginResponse", HOOK_PRIORITY.ADD_BEHAVIOR, hideButton)
	SDK.hookFunction("PreferenceExit", HOOK_PRIORITY.ADD_BEHAVIOR, hideButton)
	SDK.hookFunction("DisclaimerLoad", HOOK_PRIORITY.ADD_BEHAVIOR, hideButton)

	SDK.hookFunction("PreferenceRun", HOOK_PRIORITY.ADD_BEHAVIOR, (args, next) => {
		const ret = next(args)
		if (PreferenceSubscreen && typeof PreferenceSubscreen === "object") {
			if (PreferenceSubscreen.name !== "Main") {
				hideButton()
			} else {
				showButton()
			}
		}
		return ret
	})

	if (CurrentScreen === "Preference" || CurrentScreen === "Login") {
		showButton()
	}
}

let disabledUntil = 0

/**
 * @param {import("./types/fusam.js").ModalOptions} opts
 */
export function showModal(opts) {
	disabledUntil = Date.now() + 500
	const modal = document.createElement("dialog")
	modal.style.zIndex = "1001"
	modal.style.display = "flex"
	modal.style.flexDirection = "column"
	modal.style.width = "50em"
	modal.style.fontFamily = "Arial, Helvetica, sans-serif"
	modal.open = true

	const prompt = document.createElement("div")
	if (typeof opts.prompt === "string") {
		prompt.textContent = opts.prompt
	} else {
		prompt.append(opts.prompt)
	}
	modal.append(prompt)
	document.body.append(modal)

	let inputValue = ""

	if (opts.input) {
		const input = document.createElement(opts.input.type)
		switch (opts.input.type) {
			case "input":
				{
					const el = /** @type {HTMLInputElement} */ (input)
					el.type = "text"
				}
				break
			case "textarea":
				{
					const el = /** @type {HTMLTextAreaElement} */ (input)
					el.rows = 10
				}
				break
			default:
				// This should never happen
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				throw new Error(`invalid input type ${opts.input.type}`)
		}
		input.style.width = "100%"
		input.readOnly = opts.input.readonly
		input.addEventListener("mouseover", () => {
			input.select()
		})
		input.addEventListener("focus", () => {
			input.select()
		})
		input.addEventListener("change", () => {
			inputValue = input.value
		})

		input.addEventListener("keydown", (e) => {
			// MBCHC compatibility: prevent chatroom keydown events from triggering at document level
			e.stopPropagation()
		})

		input.value = opts.input.initial
		modal.append(input)
	}

	const buttonContainer = document.createElement("div")
	buttonContainer.style.display = "flex"
	buttonContainer.style.flexDirection = "row"
	buttonContainer.style.justifyContent = "space-between"
	buttonContainer.style.marginTop = "1em"
	buttonContainer.style.width = "100%"
	modal.append(buttonContainer)

	const submit = document.createElement("button")
	submit.textContent = opts.buttons?.submit || "Submit"
	submit.addEventListener("click", () => {
		close("submit")
	})

	const buttons = [submit]
	for (const [k, v] of Object.entries(opts.buttons ?? {})) {
		if (k !== "submit") {
			const button = document.createElement("button")
			button.textContent = v
			button.addEventListener("click", () => {
				close(k)
			})
			buttons.push(button)
		}
	}

	for (const button of buttons) {
		button.style.padding = "0.5em"
		button.style.flexGrow = "1"
	}

	buttonContainer.append(...buttons)

	modal.addEventListener("click", (e) => {
		e.stopPropagation()
	})
	/**
	 * @param {KeyboardEvent} e
	 */
	const keyClick = (e) => {
		e.stopPropagation()
		if (e.key === "Escape") {
			close()
		}
	}
	document.addEventListener("keydown", keyClick)

	// Click-blocker
	const blocker = document.createElement("div")
	blocker.style.position = "fixed"
	blocker.style.top = "0"
	blocker.style.left = "0"
	blocker.style.width = "100vw"
	blocker.style.height = "100vh"
	blocker.style.zIndex = "1000"
	blocker.style.backgroundColor = "rgba(0, 0, 0, 0.9)"
	blocker.title = "Click to close the modal"
	blocker.addEventListener("click", () => {
		close()
	})
	blocker.addEventListener("focus", () => {
		close()
	})
	document.body.append(blocker)

	/**
	 * @param {string} action
	 */
	function close(action = "close") {
		if (Date.now() < disabledUntil) {
			return
		}
		disabledUntil = Date.now() + 500
		modal.close()
		modal.remove()
		blocker.remove()
		document.removeEventListener("keydown", keyClick)
		opts.callback(action, inputValue)
	}
}

/**
 * @param {Omit<import("./types/fusam.js").ModalOptions, "callback">} opts
 * @returns {Promise<[string, string | null]>}
 */
export function showAsyncModal(opts) {
	return new Promise((resolve) => {
		showModal({
			...opts,
			callback: (action, inputValue) => {
				resolve([action, inputValue ?? null])
			},
		})
	})
}

export function getUserLanguages() {
	return navigator.languages.reduce((stack, val) => {
		stack.push(val)
		stack.push(val.split("-")[0])
		return stack
	}, /** @type {string[]} */ ([]))
}

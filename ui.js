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
import { getLanguagePreference, languageOptions, setLanguagePreference, t } from "./translations/index.js"

const showButtonId = "fusam-show-button"
const addonManagerId = "fusam-addon-manager-container"
const addonManagerCloseButtonId = "fusam-addon-manager-close"
const viewModeStorageKey = "fusam-addon-manager-view"
const addonFilterStorageKey = "fusam-addon-manager-filter"
/** @type {"list" | "thumbnails"} */
let viewMode = localStorage.getItem(viewModeStorageKey) === "thumbnails" ? "thumbnails" : "list"
/** @type {"all" | "on" | "off"} */
let addonFilter = ["all", "on", "off"].includes(localStorage.getItem(addonFilterStorageKey) ?? "")
	? /** @type {"all" | "on" | "off"} */ (localStorage.getItem(addonFilterStorageKey))
	: "all"
let selectedAddonId = ""
let defaultIntroHidden = false
let languageMenuOpen = false

/**
 * @param {any[]} [args]
 * @param {(...args: any[]) => any} [next]
 */
function showButton(args, next) {
	if (!document.getElementById(showButtonId)) {
		const button = document.createElement("button")
		button.id = showButtonId
		button.classList.add("button", "fusam")
		button.innerText = t("addonManager")
		button.onclick = showAddonManager
		document.body.appendChild(button)
	}
	return next ? next(args) : undefined
}

/**
 * @param {any[]} [args]
 * @param {(...args: any[]) => any} [next]
 */
export function hideButton(args, next) {
	document.getElementById(showButtonId)?.remove()
	return next ? next(args) : undefined
}

export async function showAddonManager() {
	if (document.getElementById(addonManagerId)) return
	defaultIntroHidden = false
	const manager = document.createElement("div")
	manager.id = addonManagerId
	manager.classList.add("fusam")
	document.body.appendChild(manager)

	manager.textContent = t("loading")

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
	applyFilters()
}

function applyFilters() {
	const userQuery = /** @type {HTMLInputElement | null} */ (document.getElementById("fusam-search")?.value ?? "")
		.toLocaleLowerCase()
		.trim()
	for (const entry of document.querySelectorAll("#fusam-addons .fusam-addon-container")) {
		const entryName = /** @type {HTMLElement | null} */ (
			entry.querySelector("h2")
		)?.dataset.fusamText?.toLocaleLowerCase()
		if (entryName != null) {
			const enabled = entry.classList.contains("fusam-enabled")
			const filteredByState = (addonFilter === "on" && !enabled) || (addonFilter === "off" && enabled)
			entry.classList.toggle(
				"fusam-hide",
				filteredByState || (userQuery !== "" && !entryName.includes(userQuery))
			)
		}
	}
}

/** @param {string} value */
function escapeAttribute(value) {
	return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

/** @this {HTMLButtonElement} */
function changeView() {
	viewMode = viewMode === "list" ? "thumbnails" : "list"
	if (viewMode === "list") {
		selectedAddonId = ""
		renderAddonIntro()
	}
	localStorage.setItem(viewModeStorageKey, viewMode)
	applyViewMode()
}

function changeAddonFilter() {
	addonFilter = addonFilter === "all" ? "on" : addonFilter === "on" ? "off" : "all"
	localStorage.setItem(addonFilterStorageKey, addonFilter)
	applyAddonFilterButton()
	applyFilters()
}

function applyAddonFilterButton() {
	const button = document.getElementById("fusam-addon-filter")
	if (button) button.textContent = addonFilter.toUpperCase()
}

function applyViewMode() {
	const addons = document.getElementById("fusam-addons")
	if (!addons) return
	addons.dataset.view = viewMode
	const button = document.getElementById("fusam-view-toggle")
	const image = button?.querySelector("img")
	const targetMode = viewMode === "list" ? "thumbnails" : "list"
	if (button) {
		button.title = targetMode === "thumbnails" ? t("thumbnailView") : t("listView")
		button.setAttribute("aria-label", button.title)
	}
	if (image instanceof HTMLImageElement) image.src = `${BaseURL}static/assets/model_${viewMode}.svg`
}

function toggleLanguageMenu() {
	languageMenuOpen = !languageMenuOpen
	applyLanguageMenuState()
}

/** @this {HTMLButtonElement} */
async function changeLanguage() {
	const language = this.dataset.language
	if (!language) return
	setLanguagePreference(language)
	languageMenuOpen = false
	const showButton = document.getElementById(showButtonId)
	if (showButton) showButton.textContent = t("addonManager")
	await redrawAddonManager()
}

function applyLanguageMenuState() {
	const menu = document.getElementById("fusam-language-menu")
	const button = document.getElementById("fusam-language-button")
	menu?.classList.toggle("fusam-hide", !languageMenuOpen)
	button?.setAttribute("aria-expanded", String(languageMenuOpen))
}

/** @param {MouseEvent} event */
function documentClick(event) {
	if (!languageMenuOpen || (event.target instanceof Element && event.target.closest(".fusam-language-picker"))) return
	languageMenuOpen = false
	applyLanguageMenuState()
}

/** @this {HTMLElement} */
function selectAddon() {
	if (viewMode !== "thumbnails") return
	const id = this.dataset.addon
	if (!id) return
	defaultIntroHidden = true
	document.querySelector(".fusam-intro")?.classList.add("fusam-hide")
	selectedAddonId = selectedAddonId === id ? "" : id
	renderAddonIntro()
}

function renderAddonIntro() {
	const intro = document.getElementById("fusam-addon-intro")
	if (!intro) return
	intro.replaceChildren()
	intro.classList.toggle("fusam-hide", !selectedAddonId)
	if (!selectedAddonId) return
	const source = document.querySelector(
		`#fusam-addons .fusam-addon-container[data-addon="${CSS.escape(selectedAddonId)}"]`
	)
	if (!(source instanceof HTMLElement)) return
	const clone = /** @type {HTMLElement} */ (source.cloneNode(true))
	clone.classList.remove("fusam-hide")
	clone.removeAttribute("onclick")
	clone.querySelectorAll(".addon-name").forEach((name) => name.removeAttribute("style"))
	clone.querySelectorAll("[id]").forEach((element) => {
		const oldId = element.id
		element.id = `fusam-intro-${oldId}`
		clone
			.querySelectorAll(`label[for="${CSS.escape(oldId)}"]`)
			.forEach((label) => label.setAttribute("for", element.id))
	})
	intro.append(clone)
	registerAddonSelectListeners(intro)
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

	render(`#${addonManagerId}`, draw(), {
		debugReport,
		searchInput,
		changeView,
		changeAddonFilter,
		selectAddon,
		toggleLanguageMenu,
		changeLanguage,
	})
	applyViewMode()
	applyAddonFilterButton()
	applyFilters()

	function draw() {
		const languagePreference = getLanguagePreference()
		const selectedLanguage = languageOptions.find(({ code }) => code === languagePreference) ?? languageOptions[0]
		return `
			<header id="fusam-addon-manager-header">
				<div class="fusam-search-box">
					<input type="search" placeholder="${t("filterAddons")}" id="fusam-search" oninput="searchInput()" list="fusam-search-list"></input>
					<datalist id="fusam-search-list">
					${s.manifest.addons
						.map((entry) => entry.name)
						.sort()
						.map((value) => `<option value="${value}"></option>`)
						.join("")}
					</datalist>
				</div>
				<h1 class="fusam-title">${t("addonManager")}</h1>
				<div class="fusam-header-buttons" role="group">
					<button id="fusam-addon-filter" onclick="changeAddonFilter()" title="ALL / ON / OFF" class="fusam-text-button">${addonFilter.toUpperCase()}</button>
					<button id="fusam-view-toggle" onclick="changeView()" aria-label="${viewMode === "list" ? t("thumbnailView") : t("listView")}" title="${viewMode === "list" ? t("thumbnailView") : t("listView")}" class="fusam-icon-button"><img src="${BaseURL}static/assets/model_${viewMode}.svg"></button>
					<div class="fusam-language-picker">
						<button id="fusam-language-button" onclick="toggleLanguageMenu()" class="fusam-icon-button" aria-haspopup="menu" aria-expanded="${languageMenuOpen}" title="Language: ${selectedLanguage.label}"><span class="fusam-flag">${selectedLanguage.flag}</span></button>
						<div id="fusam-language-menu" class="fusam-language-menu ${languageMenuOpen ? "" : "fusam-hide"}" role="menu">
							${languageOptions.map(({ code, flag, label }) => `<button type="button" role="menuitem" data-language="${code}" onclick="changeLanguage()" class="${code === languagePreference ? "fusam-language-selected" : ""}"><span class="fusam-flag">${flag}</span><span>${label}</span></button>`).join("")}
						</div>
					</div>
					<button onclick="debugReport()" class="fusam-icon-button"><img src="${BaseURL}static/assets/debug.svg"></button>
					${drawExitButton()}
				</div>
			</header>
			<div id="fusam-addon-intro" class="fusam-hide"></div>
			<div id="fusam-addon-manager-body">
			<div class="fusam-intro ${defaultIntroHidden ? "fusam-hide" : ""}">
					<h3>
						${t("introTitle")}
					</h3>
					<p>
						${t("introChoose")}
					</p>
					<p>
						${t("introSecurity")}
					</p>
				</div>
				${
					GameVersion.toLowerCase().includes("beta")
						? `<p class="warn">
							${t("betaWarning")}
						</p>`
						: ""
				}
				<menu id="fusam-addons">
				${s.manifest.addons.map((entry) => drawEntry(entry)).join("")}
				</menu>
				<footer class="fusam-attribution">
					<b id="fusam-glossary-label">${t("glossary")}</b>
					<dl aria-labelledby="fusam-glossary-label">
						<dt id="fusam-glossary-account">${t("account")}</dt>
						<dd>${t("accountHelp")}</dd>
						<dt id="fusam-glossary-browser">${t("browser")}</dt>
						<dd>${t("browserHelp")}</dd>
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
		const accountTooltip = !playerSettingsLoaded() ? t("loginRequired") : entry.browserOnly ? t("browserOnly") : ""
		const debuggable = canDebug(entry.id)
		const useIcons = true
		const addonName = escapeAttribute(entry.name)
		const addonDescription = escapeAttribute(entry.description)

		return `
		<li class="fusam-addon-container ${account || device ? `fusam-enabled fusam-distribution-${account || device}` : ""}" data-addon="${entry.id}" onclick="selectAddon()">
			<article class="fusam-addon" aria-labelledby="${entry.id}-name">
				<section class="addon-icon">
					${entry.icon ? `<img src="${entry.icon}" alt="${entry.name} icon">` : `<span class="addon-icon-fallback notranslate" translate="no" data-addon="${entry.id}" aria-label="${entry.id}"></span>`}
				</section>
				<section class="addon-content">
					<h2 class="addon-name notranslate" translate="no" id="${entry.id}-name" data-fusam-text="${addonName}" aria-label="${addonName}"></h2>
					<div class="addon-details"><p class="addon-description notranslate" translate="no" data-fusam-text="${addonDescription}" aria-label="${addonDescription}"></p>
					<div class="addon-authors">
						${t("by")} ${entry.author}
					</div></div>
				</section>
				<section class="addon-interactions">
					<div class="addon-left-interactions" role="group">
						<div class="fusam-addon-entry-version-device">
							<label for="${entry.id}-device">${t("browser")}</label>
							<select id="${entry.id}-device" data-addon="${entry.id}">
							<option value="none" selected>${t("none")}</option>
								${entry.versions.map((version) => drawVersionOption(version, device === version.distribution))}
							</select>
						</div>
						<div class="fusam-addon-entry-version-account">
							<label for="${entry.id}-account">${t("account")}</label>
							<select id="${entry.id}-account" data-addon="${entry.id}" ${!canAccount ? "disabled" : ""} title="${accountTooltip}">
							<option value="none" selected>${t("none")}</option>
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
	document.addEventListener("click", documentClick)
	registerAddonSelectListeners(document)
}

/** @param {Document | HTMLElement} root */
function registerAddonSelectListeners(root) {
	/** @type {HTMLSelectElement[]} */
	const allSelects = Array.from(root.querySelectorAll(".fusam-addon-entry-buttons select"))
	const maxWidth = allSelects.reduce((maxWidth, el) => Math.max(maxWidth, el.clientWidth), 0)
	if (maxWidth !== 0) {
		allSelects.forEach((e) => (e.style.width = `${maxWidth}px`))
	}

	root.querySelectorAll(".fusam-addon-entry-version-device select").forEach((element) => {
		const select = /** @type {HTMLSelectElement} select */ (element)
		select.onclick = (e) => e.stopPropagation()
		const addon = select.getAttribute("data-addon")
		if (!addon) return
		select.onchange = (e) => {
			e.stopPropagation()
			const distribution = select.value
			if (distribution === "none") {
				disableBrowserMod(addon)
			} else {
				enableBrowserMod(addon, distribution)
			}
			updateEntryState(addon)
			syncAddonSelects(addon, "device", distribution, select)
			applyFilters()
		}
	})

	root.querySelectorAll(".fusam-addon-entry-version-account select").forEach((element) => {
		const select = /** @type {HTMLSelectElement} select */ (element)
		select.onclick = (e) => e.stopPropagation()
		const addon = select.getAttribute("data-addon")
		if (!addon) return
		select.onchange = (e) => {
			e.stopPropagation()
			const distribution = select.value
			if (distribution === "none") {
				disableAccountMod(addon)
			} else {
				enableAccountMod(addon, distribution)
			}
			updateEntryState(addon)
			syncAddonSelects(addon, "account", distribution, select)
			applyFilters()
		}
	})
}

/**
 * @param {string} addon
 * @param {"device" | "account"} scope
 * @param {string} distribution
 * @param {HTMLSelectElement} source
 */
function syncAddonSelects(addon, scope, distribution, source) {
	document
		.querySelectorAll(`.fusam-addon-entry-version-${scope} select[data-addon="${CSS.escape(addon)}"]`)
		.forEach((element) => {
			if (element !== source) /** @type {HTMLSelectElement} */ (element).value = distribution
		})
}

/** @param {string} addon */
function updateEntryState(addon) {
	const entries = document.querySelectorAll(`.fusam-addon-container[data-addon="${CSS.escape(addon)}"]`)
	for (const entry of entries) updateSingleEntryState(entry)
}

/** @param {Element} entry */
function updateSingleEntryState(entry) {
	const account = /** @type {HTMLSelectElement | null} */ (
		entry.querySelector(".fusam-addon-entry-version-account select")
	)
	const device = /** @type {HTMLSelectElement | null} */ (
		entry.querySelector(".fusam-addon-entry-version-device select")
	)
	const distribution = [account?.value, device?.value].find((value) => value && value !== "none")
	entry.classList.toggle("fusam-enabled", distribution !== undefined)
	for (const name of ["stable", "beta", "dev"])
		entry.classList.toggle(`fusam-distribution-${name}`, distribution === name)
}

function hideAddonManager() {
	document.getElementById(addonManagerId)?.remove()
	document.removeEventListener("keydown", documentKeyDown)
	document.removeEventListener("paste", documentPaste)
	document.removeEventListener("click", documentClick)
	selectedAddonId = ""
	defaultIntroHidden = false
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

async function redrawAddonManager() {
	const query = /** @type {HTMLInputElement | null} */ (document.getElementById("fusam-search"))?.value ?? ""
	await drawAddonManager()
	const search = /** @type {HTMLInputElement | null} */ (document.getElementById("fusam-search"))
	if (search) search.value = query
	registerAddonSelectListeners(document)
	renderAddonIntro()
	applyFilters()
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
	submit.textContent = opts.buttons?.submit || t("submit")
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
	blocker.title = t("closeModal")
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

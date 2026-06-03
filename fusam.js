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

import { registerDebugMethod, registerFUSAMDebugMethod } from "./debug.js"
import { waitFor } from "./delay.js"
import { loadAddons } from "./loader.js"
import { updateManifest } from "./manifest.js"
import { hookUI, showAsyncModal, showModal } from "./ui.js"
import "./vendor/bcmodsdk.js"

window.FUSAM = {
	present: true,
	addons: {},
	registerDebugMethod: registerDebugMethod,
	modals: {
		open: showModal,
		openAsync: showAsyncModal,
	},
}

await waitFor(() => typeof Player !== "undefined" && !!Player)
hookUI()
await updateManifest()
loadAddons()
registerFUSAMDebugMethod()

// ==UserScript==
// @name Fantastic Ultimate Solution to Addon Management Loader
// @namespace https://www.bondageprojects.com/
// @version 1.0.6
// @description A loader for the FUSAM
// @author Sidious
// @downloadURL https://sidiousious.gitlab.io/bc-addon-loader/loader.user.js
// @match https://*.bondageprojects.elementfx.com/R*/*
// @match https://*.bondage-europe.com/R*/*
// @match https://*.bondageeurope.com/R*/*
// @match https://*.bondageprojects.com/R*/*
// @match https://*.bondage-asia.com/club/R*
// @match http://localhost:*/*
// @icon data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant none
// @run-at document-end
// ==/UserScript==
/* eslint-disable no-inline-comments */
// @ts-check
// eslint-disable-next-line
/// <reference path="./node_modules/@total-typescript/ts-reset/dist/recommended.d.ts"/>

/**
 *     FUSAM Loader
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

import(`http://localhost:3001/fusam.js?v=${(Date.now() / 10000).toFixed(0)}`)

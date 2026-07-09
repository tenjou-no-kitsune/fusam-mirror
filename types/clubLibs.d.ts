export {}

declare global {
	// Overrides the default typedef for the `PlayerOnlineSettings` interface to have type-safety for FUSAMSettings
	interface PlayerOnlineSettings {
		/** @deprecated */
		FUSAMSettings?: string
	}

	interface ExtensionSettings {
		FUSAMSettings: string
	}

	// As of BC R128/bc-stubs v128.0.0
	namespace GameReadyState {
		let load: Promise<void>
		let login: undefined | Promise<void>
	}
}

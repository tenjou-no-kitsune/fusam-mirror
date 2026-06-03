export {}

declare global {
	// Overrides the default typedef for the `PlayerOnlineSettings` interface to have type-safety for FUSAMSettings
	interface PlayerOnlineSettings {
		/** @deprecated */
		FUSAMSettings: string
	}

	interface ExtensionSettings {
		FUSAMSettings: string
	}
}

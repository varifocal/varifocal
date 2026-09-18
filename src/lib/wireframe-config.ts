export interface WireframeConfig {
	enabled: boolean;
}

declare global {
	interface Window {
		__WIREFRAME_CONFIG: WireframeConfig;
	}
}

export const config: WireframeConfig = { enabled: true };

if (typeof window !== 'undefined') {
	window.__WIREFRAME_CONFIG = config;
}

export function isEnabled(): boolean {
	if (typeof document !== 'undefined' && document.body?.dataset.wireframe === 'off') return false;
	return config.enabled;
}

export function isElementExcluded(el: Element): boolean {
	return el.dataset.wireframe === 'off';
}

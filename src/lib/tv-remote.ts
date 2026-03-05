export type TvRemoteAction =
	| "up"
	| "down"
	| "left"
	| "right"
	| "red"
	| "green"
	| "yellow"
	| "select"
	| "back"
	| "playPause";

const KEY_BY_NAME: Record<string, TvRemoteAction> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	ColorF0Red: "red",
	ColorF1Green: "green",
	ColorF2Yellow: "yellow",
	Enter: "select",
	" ": "select",
	NumpadEnter: "select",
	Escape: "back",
	Backspace: "back",
	MediaPlayPause: "playPause",
	XF86AudioPlay: "playPause",
};

const KEY_BY_CODE: Record<number, TvRemoteAction> = {
	37: "left",
	38: "up",
	39: "right",
	40: "down",
	403: "red",
	404: "green",
	405: "yellow",
	13: "select",
	10009: "back",
	461: "back",
	415: "playPause",
	19: "playPause",
};

export function getRemoteAction(event: KeyboardEvent): TvRemoteAction | null {
	if (event.key in KEY_BY_NAME) {
		return KEY_BY_NAME[event.key];
	}

	if (event.keyCode in KEY_BY_CODE) {
		return KEY_BY_CODE[event.keyCode];
	}

	return null;
}

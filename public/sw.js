const CACHE_NAME = "tizen-open-iptv-v2";
const APP_SHELL = [
	"/",
	"/manifest.webmanifest",
	"/favicon.ico",
	"/icon-192.png",
	"/icon-512.png",
	"/apple-icon.png",
];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting()),
	);
});

self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	if (request.method !== "GET") return;
	if (url.origin !== self.location.origin) return;
	if (url.pathname.startsWith("/api/")) return;

	if (request.mode === "navigate") {
		event.respondWith(
			fetch(request).catch(async () => {
				const cache = await caches.open(CACHE_NAME);
				return (await cache.match("/")) || Response.error();
			}),
		);
		return;
	}

	const isStaticAsset =
		url.pathname.startsWith("/_next/static/") ||
		/\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$/i.test(
			url.pathname,
		);

	if (!isStaticAsset) return;

	const isNextStaticAsset = url.pathname.startsWith("/_next/static/");

	if (isNextStaticAsset) {
		// Prefer always fetching the newest build asset; fallback to cache for resilience.
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (!response || response.status !== 200) {
						return response;
					}

					const cloned = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, cloned);
					});

					return response;
				})
				.catch(() =>
					caches.match(request).then((cached) => cached || Response.error()),
				),
		);
		return;
	}

	event.respondWith(
		caches.match(request).then((cached) => {
			const networkRequest = fetch(request)
				.then((response) => {
					if (!response || response.status !== 200) {
						return response;
					}

					const cloned = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, cloned);
					});

					return response;
				})
				.catch(() => cached || Response.error());

			return cached || networkRequest;
		}),
	);
});

self.addEventListener("push", (event) => {
	if (!event.data) return;

	const data = event.data.json();
	const options = {
		body: data.body,
		icon: data.icon || "/icon-192.png",
		badge: data.badge || "/icon-192.png",
		data: {
			url: data.url || "/",
		},
	};

	event.waitUntil(
		self.registration.showNotification(
			data.title || "Tizen Open IPTV",
			options,
		),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = event.notification.data?.url || "/";

	event.waitUntil(
		self.clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((clientsArr) => {
				const sameWindow = clientsArr.find(
					(client) => client.url === targetUrl,
				);
				if (sameWindow) return sameWindow.focus();
				return self.clients.openWindow(targetUrl);
			}),
	);
});

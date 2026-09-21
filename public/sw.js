/*
 * Service worker — мэдэгдэл хүлээн авах, дарахад зөв хуудас нээх.
 *
 * ⚠️ iOS дээр push нь хэрэглэгч аппыг «дэлгэцэн дээрээ нэмсэн» үед Л
 * ажиллана. Энэ файл байгаа нь хангалтгүй.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "Zulzaga EDU";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: "mn",
    data: { url: data.url || "/" },
    // Нэг даалгаврын тухай олон мэдэгдэл овоолохоос сэргийлнэ.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // Аль хэдийн нээлттэй цонх байвал шинийг нээхгүй.
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

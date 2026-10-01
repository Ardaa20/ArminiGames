# ArminiGames

İçinde mini oyunlar olan minimalist bir web sitesi. Ana sayfada sadece yuvarlak kareler var; tıklanınca oyun açılır. Oyunlar zamanla tek tek eklenir.

**Oyun eklerken veya herhangi bir arayüz yazarken önce [TEMA.md](TEMA.md) dosyasını oku ve ona uy.**

## Yapı
- `index.html` — ana sayfa (kare ızgarası). Yeni oyun için içindeki `OYUNLAR` listesine bir satır ekle.
- `assets/tema.css` — ortak renk değişkenleri, oyun sayfası çerçevesi (`.game-header`, `.game-box`, `.btn`, `.overlay`/`.modal`).
- `oyunlar/<oyun-adi>/index.html` + `.js` — her oyun kendi klasöründe; geri butonu `../../index.html`'e gider.
- Saf HTML/CSS/JS, derleme adımı yok. Bağlantılar `.../index.html` şeklinde açıkça yazılır ki dosya çift tıklanarak da açılabilsin.

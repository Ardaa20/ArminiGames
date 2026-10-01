# ArminiGames — Tema Rehberi

Bu dosya sitenin ve **tüm oyunların** görsel kurallarını tanımlar.
Yeni bir oyun eklerken önce bu dosyayı oku ve buradaki değişkenlerin dışına çıkma.

---

## 1. Genel His

- **Minimalist:** Ekranda sadece gerekli olan şey olur. Süs, gölge yığını, gradyan, ikon kalabalığı yok.
- **Yumuşak:** Pastel, düşük doygunlukta renkler. Saf siyah (`#000`) ve saf beyaz (`#fff`) kullanılmaz.
- **Temiz:** Bol boşluk, hizalı düzen, tek yazı tipi.
- **Sakin:** Animasyonlar kısa ve yumuşak; yanıp sönen, sallanan, parlayan efekt yok.

---

## 2. Renk Paleti

Tüm renkler CSS değişkeni olarak tanımlanır ve **sadece bu değişkenler** kullanılır.

```css
:root {
  /* Zemin ve yüzeyler */
  --bg:        #F6F4F0;  /* sayfa arka planı – sıcak kırık beyaz */
  --surface:   #FFFDFA;  /* kare / kart yüzeyi */
  --border:    #E8E4DD;  /* ince çizgiler */
  --muted:     #DDD6CB;  /* nötr ikinci zemin (ör. satranç koyu kareleri) */

  /* Yazı */
  --text:      #3A3835;  /* ana yazı – yumuşak koyu gri */
  --text-soft: #8C8780;  /* ikincil yazı, açıklamalar */

  /* Vurgu (oyunlarda en fazla 2 tanesi birlikte kullanılır) */
  --accent:    #8FA8C8;  /* yumuşak mavi – ana vurgu */
  --accent-2:  #A8C3A0;  /* adaçayı yeşili – başarı / doğru */
  --accent-3:  #E3B5A4;  /* şeftali – hata / uyarı */
  --accent-4:  #C9B8D9;  /* lavanta – nadir, özel durumlar */
}
```

### Kurallar
- Bir oyunda **en fazla 2 vurgu rengi** + zemin/yazı renkleri.
- Doğru/başarılı → `--accent-2`, yanlış/hata → `--accent-3`.
- Yeni renk gerekiyorsa önce bu dosyaya eklenir, sonra kullanılır. Oyun içine rastgele hex yazılmaz.

---

## 3. Yazı Tipi

```css
font-family: "Nunito", system-ui, sans-serif;
```
Google Fonts: `https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap`

| Kullanım        | Boyut  | Ağırlık |
|-----------------|--------|---------|
| Sayfa başlığı   | 28px   | 700     |
| Oyun adı        | 16px   | 600     |
| Normal yazı     | 15px   | 400     |
| Küçük not / skor| 13px   | 600     |

---

## 4. Şekil, Boşluk, Gölge

```css
:root {
  --radius:     24px;  /* oyun kareleri */
  --radius-sm:  12px;  /* butonlar, küçük öğeler */
  --gap:        20px;  /* kareler arası boşluk */
  --pad:        24px;  /* iç boşluk */
  --shadow:     0 2px 10px rgba(58, 56, 53, 0.06);  /* tek ve hafif gölge */
  --ease:       180ms ease;
}
```

- Köşeler **her zaman yuvarlak**. Keskin köşe yok.
- Gölge sadece `--shadow`; başka gölge eklenmez.
- Kenarlık gerekiyorsa `1px solid var(--border)`.

---

## 5. Ana Sayfa (Oyun Izgarası)

- Sayfada sadece: küçük bir başlık + **yuvarlak kareler** ızgarası. Başka bir şey yok.
- Her kare **1:1 oranında** (`aspect-ratio: 1`).
- Karenin içinde: ortada basit tek renkli bir sembol/şekil + altında oyunun adı.
- Izgara: `grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));`
- Maksimum genişlik ~`960px`, ortalanmış. Mobilde kenar boşluğu `16px`.
- Üzerine gelince (hover): kare hafifçe büyür `transform: scale(1.03)` ve gölge biraz belirginleşir. Hepsi `--ease` ile.
- Tıklayınca oyun açılır.

```css
.tile {
  aspect-ratio: 1;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: grid;
  place-items: center;
  transition: transform var(--ease), box-shadow var(--ease);
}
.tile:hover { transform: scale(1.03); box-shadow: 0 4px 16px rgba(58,56,53,.09); }
```

---

## 6. Oyun Sayfaları İçin Kurallar

Her oyun aynı çerçeveyi kullanır:

- Sol üstte **geri butonu** (`←`), yanında oyunun adı.
- Sağ üstte (varsa) **skor** — sade, `--text-soft` renkte.
- Oyun alanı ortada, `--surface` zeminli, `--radius` köşeli bir kutu içinde.
- Butonlar: `--radius-sm`, `--accent` zemin, `--text` veya `--surface` yazı; üstüne gelince hafif koyulaşır.
- Oyun içi şekiller de yuvarlak köşeli ve paletteki renklerden.
- **Çok renkli oyun yok:** Gökkuşağı, neon, parlak renk yok. Renk ayrımı gerekirse paletteki vurgu tonları kullanılır.
- Ses yoksa da olur; varsa yumuşak ve kısa.
- Hem fare hem dokunmatik çalışmalı, mobilde taşma olmamalı.

---

## 7. Yapma Listesi ❌

- Gradyan arka plan
- Birden fazla yazı tipi
- Kalın/koyu gölgeler
- Saf siyah veya saf beyaz
- Keskin köşeler
- Paletin dışında renk
- Kalabalık arayüz, gereksiz ikon/emoji

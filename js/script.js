let semuaBerita = [];
let slideIndex = 0;
let sliderInterval = null;

const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function safeURL(value) {
  const url = String(value || "").trim();
  if (/^(https?:|images\/|\.\/images\/)/i.test(url)) return escapeHTML(url);
  return "";
}

function formatTanggal(value) {
  return escapeHTML(value || "Tanggal tidak tersedia");
}

function sortBeritaTerbaru(data) {
  return [...data].sort((a, b) => {
    const parse = value => {
      const raw = String(value || "").trim();
      const months = {januari:0,februari:1,maret:2,april:3,mei:4,juni:5,juli:6,agustus:7,september:8,oktober:9,november:10,desember:11};
      const match = raw.match(/^(\\d{1,2})\\s+([A-Za-z]+)\\s+(\\d{4})$/);
      if (match && months[match[2].toLocaleLowerCase("id")] !== undefined) {
        return new Date(Number(match[3]), months[match[2].toLocaleLowerCase("id")], Number(match[1])).getTime();
      }
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return parse(b.tanggal) - parse(a.tanggal);
  });
}

function toggleMenu(force) {
  const menu = document.querySelector(".nav-menu");
  const toggle = document.querySelector(".menu-toggle");
  if (!menu || !toggle) return;
  const open = typeof force === "boolean" ? force : !menu.classList.contains("show");
  menu.classList.toggle("show", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Tutup navigasi" : "Buka navigasi");
  toggle.textContent = open ? "×" : "☰";
}

document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".nav-menu");
  toggle?.addEventListener("click", () => toggleMenu());
  menu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => toggleMenu(false)));
  document.addEventListener("click", event => {
    if (menu && toggle && !menu.contains(event.target) && !toggle.contains(event.target)) toggleMenu(false);
  });

  const search = document.getElementById("searchInput");
  const clear = document.getElementById("clearSearch");
  search?.addEventListener("input", () => {
    filterBerita();
    if (clear) clear.hidden = !search.value;
  });
  clear?.addEventListener("click", () => {
    search.value = "";
    clear.hidden = true;
    filterBerita();
    search.focus();
  });

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
  const today = document.getElementById("todayDate");
  if (today) today.textContent = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

  const form = document.querySelector(".contact-form");
  form?.addEventListener("submit", kirimWA);

  loadBerita();
});

async function loadBerita() {
  try {
    const response = await fetch("data/berita.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Server tidak dapat memuat data berita.");
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Format data berita tidak sesuai.");
    semuaBerita = sortBeritaTerbaru(data);
    renderHero(semuaBerita);
    renderList(semuaBerita);
    renderDetail(semuaBerita);
    autoSlide();
  } catch (error) {
    console.error("Gagal memuat berita:", error);
    const hero = document.getElementById("heroSlider");
    const list = document.getElementById("newsList");
    if (hero) hero.innerHTML = '<div class="empty-state">Berita belum dapat dimuat. Periksa koneksi atau file data berita.</div>';
    if (list) list.innerHTML = '<div class="empty-state">Terjadi kendala saat memuat berita. Silakan coba muat ulang halaman.</div>';
    const detail = document.getElementById("detailBerita");
    if (detail) detail.innerHTML = '<div class="empty-state">Artikel belum dapat dimuat. Silakan coba lagi.</div>';
  }
}

function normalizeMediaList(value) {
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap(item => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object") {
        const nested = item.url || item.src || item.gambar || item.path || "";
        return nested ? [nested] : [];
      }
      return [];
    })
    .map(item => String(item).trim())
    .filter(Boolean);
}

function getPrimaryMedia(value) {
  return normalizeMediaList(value)[0] || "";
}

function renderMedia(src, alt, cssClass = "card-media") {
  const mediaSource = typeof src === "string" ? src : getPrimaryMedia(src);
  const safeSrc = safeURL(mediaSource);
  const safeAlt = escapeHTML(alt || "Foto berita");
  if (!safeSrc) return `<div class="${cssClass} media-placeholder" role="img" aria-label="Gambar tidak tersedia"></div>`;
  if (/\.mp4($|\?)/i.test(mediaSource)) {
    return `<video controls playsinline preload="metadata" class="${cssClass}" aria-label="${safeAlt}"><source src="${safeSrc}" type="video/mp4">Browser Anda tidak mendukung video.</video>`;
  }
  return `<img loading="lazy" decoding="async" src="${safeSrc}" alt="${safeAlt}" class="${cssClass}" onerror="this.style.display='none'">`;
}

function renderGallery(mediaValue, title, cssClass = "article-gallery") {
  const sources = normalizeMediaList(mediaValue);
  if (!sources.length) return `<div class="${cssClass} media-placeholder" role="img" aria-label="Gambar tidak tersedia"></div>`;

  if (sources.length === 1) {
    return renderMedia(sources[0], title, cssClass === "article-gallery" ? "article-image" : cssClass);
  }

  const slides = sources.map((src, index) => `
    <div class="gallery-slide ${index === 0 ? "active" : ""}" data-index="${index}" aria-label="Foto ${index + 1} dari ${sources.length}">
      ${renderMedia(src, `${title} ${index + 1}`, "gallery-image")}
    </div>
  `).join("");

  const dots = sources.map((_, index) => `
    <button type="button" class="gallery-dot ${index === 0 ? "active" : ""}" data-index="${index}" aria-label="Lihat foto ${index + 1}"></button>
  `).join("");

  return `
    <div class="media-gallery ${cssClass}" tabindex="0" aria-label="Galeri foto ${escapeHTML(title)}">
      <div class="gallery-track">
        ${slides}
      </div>
      <div class="gallery-controls">
        <button type="button" class="gallery-btn gallery-prev" aria-label="Foto sebelumnya">‹</button>
        <div class="gallery-dots">${dots}</div>
        <button type="button" class="gallery-btn gallery-next" aria-label="Foto berikutnya">›</button>
      </div>
    </div>
  `;
}

function bindMediaGallery() {
  document.querySelectorAll(".media-gallery").forEach(gallery => {
    const track = gallery.querySelector(".gallery-track");
    const slides = [...gallery.querySelectorAll(".gallery-slide")];
    const dots = [...gallery.querySelectorAll(".gallery-dot")];
    const prevBtn = gallery.querySelector(".gallery-prev");
    const nextBtn = gallery.querySelector(".gallery-next");

    if (!track || slides.length < 2) return;

    let currentIndex = 0;

    const update = (nextIndex) => {
      currentIndex = (nextIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      slides.forEach((slide, index) => slide.classList.toggle("active", index === currentIndex));
      dots.forEach((dot, index) => dot.classList.toggle("active", index === currentIndex));
    };

    prevBtn?.addEventListener("click", () => update(currentIndex - 1));
    nextBtn?.addEventListener("click", () => update(currentIndex + 1));
    dots.forEach(dot => dot.addEventListener("click", () => update(Number(dot.dataset.index || 0))));
    gallery.addEventListener("keydown", event => {
      if (event.key === "ArrowLeft") update(currentIndex - 1);
      if (event.key === "ArrowRight") update(currentIndex + 1);
    });
    update(0);
  });
}

function renderHero(data) {
  const hero = document.getElementById("heroSlider");
  if (!hero) return;
  if (!data.length) {
    hero.innerHTML = '<div class="empty-state">Belum ada berita untuk ditampilkan.</div>';
    return;
  }
  hero.innerHTML = data.slice(0, 3).map((b, i) => `
    <article class="hero-item ${i === 0 ? "active" : ""}">
      ${renderMedia(getPrimaryMedia(b.gambar), b.judul, "hero-media")}
      <div class="hero-overlay">
        <span class="hero-badge">BERITA PILIHAN</span>
        <h2>${escapeHTML(b.judul)}</h2>
        <p>${escapeHTML(b.ringkasan || "")}</p>
        <a class="btn" href="berita.html?id=${encodeURIComponent(b.id)}">Baca selengkapnya <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `).join("");
}

function autoSlide() {
  const slides = document.querySelectorAll(".hero-item");
  if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (sliderInterval) clearInterval(sliderInterval);
  sliderInterval = setInterval(() => {
    slides[slideIndex]?.classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex]?.classList.add("active");
  }, 5500);
}

function renderList(data) {
  const list = document.getElementById("newsList");
  if (!list) return;
  if (!data.length) {
    list.innerHTML = '<div class="empty-state">Tidak ada berita yang cocok dengan pencarianmu. Coba kata kunci lain.</div>';
    return;
  }
  list.innerHTML = data.map(b => `
    <article class="card">
      ${renderMedia(getPrimaryMedia(b.gambar), b.judul)}
      <div class="card-body">
        <span class="card-date">${formatTanggal(b.tanggal)}</span>
        <h3>${escapeHTML(b.judul)}</h3>
        <p>${escapeHTML(b.ringkasan || "")}</p>
        <a class="btn" href="berita.html?id=${encodeURIComponent(b.id)}">Baca berita <span aria-hidden="true">→</span></a>
      </div>
    </article>
  `).join("");
}

function filterBerita() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const keyword = input.value.toLocaleLowerCase("id").trim();
  const result = semuaBerita.filter(b =>
    [b.judul, b.ringkasan, b.isi].some(value =>
      String(value || "").toLocaleLowerCase("id").includes(keyword)
    )
  );
  renderList(result);
}

function formatIsi(text) {
  return String(text || "").trim().split(/\n\s*\n/)
    .filter(paragraph => paragraph.trim())
    .map(paragraph => {
      let safe = escapeHTML(paragraph.trim()).replace(/\n/g, "<br>");
      safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      safe = safe.replace(/\*(.*?)\*/g, "<em>$1</em>");
      return `<p>${safe}</p>`;
    }).join("");
}

function renderDetail(data) {
  const target = document.getElementById("detailBerita");
  if (!target) return;

  const id = new URLSearchParams(window.location.search).get("id");
  // Halaman beranda tidak memiliki parameter id; jangan tampilkan pesan error di sana.
  if (!id) return;

  const article = data.find(item => String(item.id) === String(id));
  if (!article) {
    target.innerHTML = '<div class="empty-state"><h2>Berita tidak ditemukan</h2><p>Artikel mungkin sudah dipindahkan atau tautannya tidak sesuai.</p><a class="btn" href="index.html">Kembali ke beranda</a></div>';
    return;
  }

  const wordCount = String(article.isi || "").trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const image = renderGallery(article.gambar, article.judul, "article-gallery");
  const sources = Array.isArray(article.sumber) ? article.sumber : [];
  const related = data.filter(item => String(item.id) !== String(id)).slice(0, 3);

  target.innerHTML = `
    <article class="article">
      <div class="article-top">
        <a class="back-link" href="index.html">← Kembali ke semua berita</a>
        <h1 class="article-title">${escapeHTML(article.judul)}</h1>
        <div class="article-meta"><span>${formatTanggal(article.tanggal)}</span><span>•</span><span>${readTime} menit baca</span></div>
      </div>
      ${image}
      <div class="article-content">${formatIsi(article.isi)}</div>
      <div class="article-actions">
        <button class="btn" id="shareArticle" type="button">↗ Bagikan melalui WhatsApp</button>
      </div>
      ${sources.length ? `<section class="article-sources"><h3>Sumber informasi</h3><ul>${sources.map(source => {
        const url = /^https?:\/\//i.test(source.url || "") ? escapeHTML(source.url) : "";
        const label = [source.nama, source.judul_artikel, source.tanggal].filter(Boolean).map(escapeHTML).join(" — ");
        return `<li>${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : label}</li>`;
      }).join("")}</ul></section>` : ""}
      <section class="related-news"><h3>Berita lainnya</h3><div class="related-list">${related.map(item => `
        <a class="related-item" href="berita.html?id=${encodeURIComponent(item.id)}">
          ${renderMedia(getPrimaryMedia(item.gambar), item.judul, "related-image")}
          <span>${escapeHTML(item.judul)}</span>
        </a>`).join("")}</div></section>
    </article>
  `;

  bindMediaGallery();
  document.title = `${article.judul} | HpmmINews`;
  document.getElementById("shareArticle")?.addEventListener("click", () => shareBerita(article.judul));
}

function shareBerita(judul) {
  const url = window.location.href;
  const text = `${judul}\n\nBaca selengkapnya: ${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function kirimWA(event) {
  event.preventDefault();
  const nama = document.getElementById("nama")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";
  const pesan = document.getElementById("pesan")?.value.trim() || "";
  const nomorWA = "6282155217480";
  const text = `Halo Admin HpmmINews.\n\nNama: ${nama}\nEmail: ${email}\n\nPesan:\n${pesan}`;
  window.open(`https://wa.me/${nomorWA}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

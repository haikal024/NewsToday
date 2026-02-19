let semuaBerita = [];
let slideIndex = 0;
let sliderInterval = null;

/* ================= MENU ================= */
function toggleMenu(){
  const menu = document.querySelector(".nav-menu");
  if(menu) menu.classList.toggle("show");
}

/* AUTO CLOSE MENU */
document.addEventListener("click", function(e){
  const menu = document.querySelector(".nav-menu");
  const toggle = document.querySelector(".menu-toggle");
  if(!menu || !toggle) return;

  if(!menu.contains(e.target) && !toggle.contains(e.target)){
    menu.classList.remove("show");
  }
});

/* ================= LOAD DATA ================= */
fetch("data/berita.json")
  .then(r => {
    if(!r.ok) throw new Error("Gagal load JSON");
    return r.json();
  })
  .then(data => {
    semuaBerita = data || [];
    renderHero(semuaBerita);
    renderList(semuaBerita);
    renderDetail(semuaBerita);
    autoSlide();
  })
  .catch(err => {
    console.error("Error load berita:", err);
  });

/* ================= HERO ================= */
function renderHero(data){
  const hero = document.getElementById("heroSlider");
  if(!hero || !data.length) return;

  hero.innerHTML = data.slice(0,3).map((b,i)=>`
    <div class="hero-item ${i===0 ? 'active' : ''}">
      <img src="${b.gambar}" alt="${b.judul}">
      <div class="hero-overlay">
        <h2>${b.judul}</h2>
        <p>${b.ringkasan}</p>
        <a class="btn" href="berita.html?id=${b.id}">Baca</a>
      </div>
    </div>
  `).join("");
}

/* ================= SLIDER ================= */
function autoSlide(){
  const slides = document.querySelectorAll(".hero-item");
  if(!slides.length) return;

  if(sliderInterval) clearInterval(sliderInterval);

  sliderInterval = setInterval(()=>{
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
  }, 4000);
}

/* ================= LIST ================= */
function renderList(data){
  const list = document.getElementById("newsList");
  if(!list) return;

  if(!data.length){
    list.innerHTML = "<p>Tidak ada berita ditemukan.</p>";
    return;
  }

  list.innerHTML = data.map(b=>`
    <div class="card">
      <img src="${b.gambar}" alt="${b.judul}">
      <div class="card-body">
        <h3>${b.judul}</h3>
        <p>${b.tanggal}</p>
        <a class="btn" href="berita.html?id=${b.id}">Baca</a>
      </div>
    </div>
  `).join("");
}

/* ================= SEARCH ================= */
function filterBerita(){
  const el = document.getElementById("searchInput");
  if(!el) return;

  const key = el.value.toLowerCase().trim();

  const hasil = semuaBerita.filter(b =>
    b.judul.toLowerCase().includes(key)
  );

  renderList(hasil);
}

/* ================= DETAIL ================= */
function renderDetail(data){
  const d = document.getElementById("detailBerita");
  if(!d) return;

  const id = new URLSearchParams(location.search).get("id");
  const b = data.find(x => String(x.id) === String(id));

  if(!b){
    d.innerHTML = "<h2>Berita tidak ditemukan</h2>";
    return;
  }

  /* ===== FORMAT ARTIKEL ===== */
  let isiHTML = (b.isi || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n\n+/g, "</p><p>")                 // paragraf
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // bold
    .replace(/\*(.*?)\*/g, "<em>$1</em>");            // italic

  isiHTML = `<p>${isiHTML}</p>`;

  /* ===== ESTIMASI BACA ===== */
  const words = (b.isi || "").trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.round(words / 200));

  d.innerHTML = `
    <article class="article">
      <h1 class="article-title">${b.judul}</h1>
      
      <div class="article-meta">
        <span>${b.tanggal}</span>
        <span>• ${readTime} menit baca</span>
      </div>

      <img src="${b.gambar}"
           alt="${b.judul}"
           class="article-image">

      <div class="article-content">
        ${isiHTML}
      </div>

      <div class="article-actions">
        <button class="btn" onclick="shareBerita('${b.judul.replace(/'/g,"")}')">
          🔗 Share WhatsApp
        </button>
      </div>

      <div class="related-news">
        <h3>Berita Terkait</h3>
        <div id="relatedList"></div>
      </div>
    </article>
  `;

  renderRelated(data, id);
}

/* ================= RELATED ================= */
function renderRelated(data, currentId){
  const box = document.getElementById("relatedList");
  if(!box) return;

  const related = data
    .filter(b => String(b.id) !== String(currentId))
    .slice(0, 3);

  if(!related.length){
    box.innerHTML = "<p>Tidak ada berita terkait.</p>";
    return;
  }

  box.innerHTML = related.map(b=>`
    <a class="related-item" href="berita.html?id=${b.id}">
      <img src="${b.gambar}" alt="${b.judul}">
      <span>${b.judul}</span>
    </a>
  `).join("");
}

/* ================= SHARE ================= */
function shareBerita(judul){
  const url = window.location.href;
  const text = `${judul}\n\n${url}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}

/* ================= PWA REGISTER ================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  });
}

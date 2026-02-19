let semuaBerita = [];
let slideIndex = 0;

/* ================= MENU ================= */
function toggleMenu(){
  document.querySelector(".nav-menu").classList.toggle("show");
}

/* ================= LOAD DATA ================= */
fetch("data/berita.json")
.then(r=>r.json())
.then(data=>{
  semuaBerita = data;
  renderHero(data);
  renderList(data);
  renderDetail(data);
  autoSlide();
});

/* ================= HERO ================= */
function renderHero(data){
  const hero = document.getElementById("heroSlider");
  if(!hero) return;

  hero.innerHTML = data.slice(0,3).map((b,i)=>`
    <div class="hero-item ${i===0?'active':''}">
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

  setInterval(()=>{
    slides[slideIndex].classList.remove("active");
    slideIndex = (slideIndex + 1) % slides.length;
    slides[slideIndex].classList.add("active");
  },4000);
}

/* ================= LIST ================= */
function renderList(data){
  const list = document.getElementById("newsList");
  if(!list) return;

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

  const key = el.value.toLowerCase();
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
  const b = data.find(x=>x.id==id);

  if(!b){
    d.innerHTML = "<h2>Berita tidak ditemukan</h2>";
    return;
  }

  d.innerHTML = `
    <h1>${b.judul}</h1>
    <p>${b.tanggal}</p>
    <img src="${b.gambar}"
         alt="${b.judul}"
         style="width:100%;max-height:420px;object-fit:cover;border-radius:12px;margin:20px 0;">
    <p>${b.isi}</p>
  `;
}

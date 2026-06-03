// TechHub Main Application Script (app.js)
// Handles article cards, search, categories, and homepage slideshow

import { getPosts, getSiteSettings } from "./firebase-db.js";

let allPosts = [];
let filteredPosts = [];
let currentCategory = "all";
let searchQuery = "";
let slideshowTimer = null;
let currentSlideIndex = 0;

// Format firestore timestamps to readable date
export function formatDate(timestamp) {
  if (!timestamp) return "Just now";
  
  // Handle Firestore Timestamp objects
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// Render cards list
function renderPosts(posts) {
  const container = document.getElementById("posts-grid-container");
  if (!container) return;

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-message">
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"></path></svg>
        <h3>No articles found</h3>
        <p>Try refining your search query or choosing another category.</p>
      </div>
    `;
    return;
  }

  // Map category ID to printable category names
  const categoryNames = {
    "tech-news": "Tech News",
    "repair-articles": "Repair Articles",
    "store": "Store"
  };

  container.innerHTML = posts.map(post => {
    // Determine image URL or placeholder
    const cardImg = post.images && post.images.length > 0 && post.images[0] 
      ? post.images[0] 
      : "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=600&auto=format&fit=crop";

    // Format category badge
    const badgeClass = `badge-${post.category}`;
    const categoryLabel = categoryNames[post.category] || post.category;

    // View badges count
    const viewsCount = post.views || 0;

    // Optional store price
    const priceHTML = post.category === "store" && post.price
      ? `<div class="post-price">$${parseFloat(post.price).toFixed(2)}</div>`
      : "";

    return `
      <article class="post-card" id="card-${post.id}">
        <div class="post-card-img-wrapper">
          <span class="post-badge ${badgeClass}">${categoryLabel}</span>
          <img class="post-card-img" src="${cardImg}" alt="${post.title}" loading="lazy">
        </div>
        <div class="post-card-content">
          <div class="post-card-meta">
            <div class="post-meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              <span>${formatDate(post.createdAt)}</span>
            </div>
            <div class="post-meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              <span>${viewsCount} views</span>
            </div>
          </div>
          <h3 class="post-card-title">${post.title}</h3>
          <p class="post-card-desc">${post.description}</p>
          <div class="post-card-footer">
            ${priceHTML}
            <a class="post-card-btn" href="article.html?id=${post.id}">
              <span>More Details</span>
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// Slideshow implementation
function renderSlideshow(posts) {
  const slideTrack = document.getElementById("slideshow-track");
  const slideNav = document.getElementById("slideshow-navigation");
  if (!slideTrack || !slideNav) return;

  // Filter out posts that don't have images
  const slidePosts = posts.slice(0, 4);

  if (slidePosts.length === 0) {
    slideTrack.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">No articles available.</div>`;
    slideNav.innerHTML = "";
    return;
  }

  const categoryNames = {
    "tech-news": "Tech News",
    "repair-articles": "Repair Articles",
    "store": "Store"
  };

  // Render slides
  slideTrack.innerHTML = slidePosts.map((post, idx) => {
    const slideImg = post.images && post.images.length > 0 && post.images[0] 
      ? post.images[0] 
      : "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop";

    return `
      <div class="slide ${idx === 0 ? "active" : ""}" data-slide-index="${idx}">
        <img class="slide-img" src="${slideImg}" alt="${post.title}">
        <div class="slide-overlay"></div>
        <div class="slide-content">
          <span class="slide-category">${categoryNames[post.category] || post.category}</span>
          <h2 class="slide-title">${post.title}</h2>
          <p class="slide-desc">${post.description}</p>
          <a class="slide-btn" href="article.html?id=${post.id}">
            <span>Read Article</span>
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </a>
        </div>
      </div>
    `;
  }).join("");

  // Render slide dots
  slideNav.innerHTML = slidePosts.map((_, idx) => `
    <span class="slide-dot ${idx === 0 ? "active" : ""}" data-slide-to="${idx}"></span>
  `).join("");

  // Add click listeners to dots
  const dots = slideNav.querySelectorAll(".slide-dot");
  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slideTo);
      goToSlide(idx);
    });
  });

  // Start automation
  startSlideshowTimer();
}

function startSlideshowTimer() {
  if (slideshowTimer) clearInterval(slideshowTimer);
  slideshowTimer = setInterval(() => {
    const slides = document.querySelectorAll("#slideshow-track .slide");
    if (slides.length <= 1) return;
    let nextIdx = (currentSlideIndex + 1) % slides.length;
    goToSlide(nextIdx);
  }, 6000);
}

function goToSlide(index) {
  const slides = document.querySelectorAll("#slideshow-track .slide");
  const dots = document.querySelectorAll("#slideshow-navigation .slide-dot");
  if (slides.length === 0) return;

  slides[currentSlideIndex].classList.remove("active");
  dots[currentSlideIndex].classList.remove("active");

  currentSlideIndex = index;

  slides[currentSlideIndex].classList.add("active");
  dots[currentSlideIndex].classList.add("active");
}

// Search and Filter updates
function applyFilterAndSearch() {
  filteredPosts = allPosts.filter(post => {
    const matchesCategory = currentCategory === "all" || post.category === currentCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  renderPosts(filteredPosts);
}

// Initialize Application Page
async function initApp() {
  // Read target page filters based on layout if on news, repair or store pages
  const pathname = window.location.pathname.split("/").pop();
  if (pathname === "news.html") {
    currentCategory = "tech-news";
  } else if (pathname === "repair.html") {
    currentCategory = "repair-articles";
  } else if (pathname === "store.html") {
    currentCategory = "store";
  }

  // Load all posts from Firestore
  allPosts = await getPosts();
  applyFilterAndSearch();

  // If on main homepage (index.html), render the featured articles slideshow
  if (pathname === "" || pathname === "index.html") {
    renderSlideshow(allPosts);
  }

  // Bind Search bar
  const searchInput = document.getElementById("main-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      applyFilterAndSearch();
    });
  }

  // Bind category filter chips (on index.html)
  const filterContainer = document.getElementById("category-filters-container");
  if (filterContainer) {
    const chips = filterContainer.querySelectorAll(".filter-chip");
    chips.forEach(chip => {
      chip.addEventListener("click", (e) => {
        chips.forEach(c => c.classList.remove("active"));
        e.target.classList.add("active");
        currentCategory = e.target.dataset.category;
        
        // Update section title
        const feedHeading = document.getElementById("feed-heading-title");
        if (feedHeading) {
          const names = {
            "all": "Recent Feed",
            "tech-news": "Tech News Feed",
            "repair-articles": "Repair Manuals",
            "store": "Gadget Store"
          };
          feedHeading.innerText = names[currentCategory] || "Articles Feed";
        }
        
        applyFilterAndSearch();
      });
    });
  }

  // Check URL parameters for initial category filter (e.g. index.html?cat=store)
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get("cat");
  if (catParam) {
    const targetChip = document.querySelector(`.filter-chip[data-category="${catParam}"]`);
    if (targetChip) {
      targetChip.click();
    }
  }
}

document.addEventListener("DOMContentLoaded", initApp);

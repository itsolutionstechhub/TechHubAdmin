// TechHub Article Detail Viewer Script (article.js)
// Increments views, downloads post data, builds image slideshow, and maps sidebar widgets

import { getPostById, incrementViews } from "./firebase-db.js";
import { formatDate } from "./app.js";
import { showToast } from "./shared.js";

let post = null;
let currentSlide = 0;
let slideImages = [];

// Convert plain text newlines into clean HTML paragraphs
function formatDescriptionToHTML(text) {
  if (!text) return "";
  // Split by double newline to form paragraphs
  return text
    .split(/\n\s*\n/)
    .map(para => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

// Render dynamic slideshow logic
function buildSlideshow() {
  const wrapper = document.getElementById("slideshow-wrapper");
  const dotsContainer = document.getElementById("slideshow-dots");
  const controls = document.getElementById("slideshow-controls");
  
  if (!wrapper || !dotsContainer || !controls) return;

  // Filter out any blank image fields
  slideImages = (post.images || []).filter(img => img && img.trim() !== "");

  // If no images, use a tech placeholder
  if (slideImages.length === 0) {
    slideImages.push("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop");
  }

  // Render slides markup
  wrapper.innerHTML = slideImages.map((img, idx) => `
    <div class="article-slide ${idx === 0 ? "active" : ""}" data-index="${idx}">
      <img src="${img}" alt="${post.title} - Slide ${idx + 1}" loading="lazy">
    </div>
  `).join("");

  // Render dot indicators
  dotsContainer.innerHTML = slideImages.map((_, idx) => `
    <span class="slideshow-dot ${idx === 0 ? "active" : ""}" data-to="${idx}"></span>
  `).join("");

  // Setup click triggers on dots
  const dots = dotsContainer.querySelectorAll(".slideshow-dot");
  dots.forEach(dot => {
    dot.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.to);
      goToSlide(idx);
    });
  });

  // Hide arrows if only one slide
  if (slideImages.length <= 1) {
    controls.style.display = "none";
    dotsContainer.style.display = "none";
  } else {
    controls.style.display = "flex";
    dotsContainer.style.display = "flex";
    
    // Wire up arrow navigation
    document.getElementById("prev-slide").onclick = () => {
      let prevIdx = (currentSlide - 1 + slideImages.length) % slideImages.length;
      goToSlide(prevIdx);
    };
    
    document.getElementById("next-slide").onclick = () => {
      let nextIdx = (currentSlide + 1) % slideImages.length;
      goToSlide(nextIdx);
    };
  }
}

function goToSlide(index) {
  const slides = document.querySelectorAll("#slideshow-wrapper .article-slide");
  const dots = document.querySelectorAll("#slideshow-dots .slideshow-dot");
  if (slides.length === 0) return;

  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");

  currentSlide = index;

  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

// Map widgets and share buttons
function setupSidebarAndMetadata() {
  const currentURL = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(post.title);

  // Setup sharing buttons
  document.getElementById("share-facebook").onclick = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${currentURL}`, "_blank");
  };
  
  document.getElementById("share-whatsapp").onclick = () => {
    window.open(`https://api.whatsapp.com/send?text=${shareTitle}%20-%20${currentURL}`, "_blank");
  };
  
  document.getElementById("share-twitter").onclick = () => {
    window.open(`https://twitter.com/intent/tweet?text=${shareTitle}&url=${currentURL}`, "_blank");
  };

  // Toggle store widget
  const storeWidget = document.getElementById("store-widget");
  if (post.category === "store") {
    storeWidget.style.display = "block";
    document.getElementById("widget-price").innerText = post.price 
      ? `$${parseFloat(post.price).toFixed(2)}` 
      : "Contact for Price";
    
    const buyBtn = document.getElementById("widget-buy-btn");
    if (post.link) {
      buyBtn.href = post.link;
    } else {
      // Default to contact page if no buy link is present
      buyBtn.href = `contact.html?inquiry=${encodeURIComponent(post.title)}`;
    }
  }

  // Toggle download widget
  const downloadWidget = document.getElementById("download-widget");
  if (post.downloadLink && post.downloadLink.trim() !== "") {
    downloadWidget.style.display = "block";
    document.getElementById("widget-download-btn").href = post.downloadLink;
  }

  // Toggle reference link widget
  const linkWidget = document.getElementById("link-widget");
  if (post.link && post.link.trim() !== "" && post.category !== "store") {
    linkWidget.style.display = "block";
    document.getElementById("widget-link-btn").href = post.link;
  }
}

// Loader trigger
async function initArticlePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");

  if (!id) {
    document.getElementById("loading-spinner").innerHTML = `
      <div class="empty-message">
        <h3>Invalid Article link</h3>
        <p>No valid ID provided. <a href="index.html" style="color: var(--primary); text-decoration: underline;">Go back home</a>.</p>
      </div>
    `;
    return;
  }

  // 1. Increment views on database immediately
  await incrementViews(id);

  // 2. Fetch post information
  post = await getPostById(id);

  if (!post) {
    document.getElementById("loading-spinner").innerHTML = `
      <div class="empty-message">
        <h3>Article not found</h3>
        <p>The post might have been deleted by the administrator. <a href="index.html" style="color: var(--primary); text-decoration: underline;">Go back home</a>.</p>
      </div>
    `;
    return;
  }

  // Set page document title dynamically
  document.title = `${post.title} - TechHub`;

  // Map category ID to printable labels
  const categoryNames = {
    "tech-news": "Tech News",
    "repair-articles": "Repair Articles",
    "store": "Store"
  };
  const printableCategory = categoryNames[post.category] || post.category;

  // 3. Inject details into HTML template
  document.getElementById("breadcrumb-category").innerText = printableCategory;
  document.getElementById("breadcrumb-title").innerText = post.title;
  document.getElementById("detail-title").innerText = post.title;
  
  const detailBadge = document.getElementById("detail-badge");
  detailBadge.innerText = printableCategory;
  detailBadge.className = `article-category-badge badge-${post.category}`;
  
  document.getElementById("detail-date").innerText = formatDate(post.createdAt);
  document.getElementById("detail-views").innerText = `${post.views || 0} views`;
  document.getElementById("detail-body").innerHTML = formatDescriptionToHTML(post.description);

  // 4. Build components
  buildSlideshow();
  setupSidebarAndMetadata();

  // Show layout, hide spinner loader
  document.getElementById("loading-spinner").style.display = "none";
  document.getElementById("article-detail-view").style.display = "grid";
}

document.addEventListener("DOMContentLoaded", initArticlePage);

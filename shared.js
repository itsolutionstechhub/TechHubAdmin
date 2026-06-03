// TechHub Shared script
// Handles Header, Footer, Dark/Light Theme, dynamic statutory pages and Toast notifications

import { getSiteSettings, getPagesContent } from "./firebase-db.js";

// Initialize Toast system container
function initToastContainer() {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
}

// Global Toast function
export function showToast(message, type = "success") {
  initToastContainer();
  const container = document.getElementById("toast-container");
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  let icon = "";
  if (type === "success") {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>`;
  } else if (type === "danger") {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
  
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);
  
  // Trigger slide-in
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Slide out and remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

// Initialize Theme
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  const themeBtns = document.querySelectorAll(".theme-btn");
  themeBtns.forEach(btn => {
    if (theme === "light") {
      // Moon icon
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    } else {
      // Sun icon
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    }
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeIcon(newTheme);
  showToast(`Switched to ${newTheme} mode`, "success");
}

// Render dynamic navbar and footer based on site configuration
export async function renderCommonComponents() {
  const settings = await getSiteSettings();
  if (!settings) return;

  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  // Build Navbar HTML
  const headerContainer = document.getElementById("navbar-container");
  if (headerContainer) {
    const categoriesList = settings.categories || [];
    
    // Map files to dynamic category routes
    const categoryLinkMap = {
      "tech-news": "news.html",
      "repair-articles": "repair.html",
      "store": "store.html"
    };

    // Render logo
    const logoContent = settings.logoUrl 
      ? `<img src="${settings.logoUrl}" alt="${settings.name}">` 
      : `<span>${settings.logoText || settings.name}</span>`;

    let navItemsHTML = `
      <a class="nav-link ${currentPath === "index.html" ? "active" : ""}" href="index.html">Home</a>
    `;

    categoriesList.forEach(cat => {
      const pageLink = categoryLinkMap[cat.id] || `index.html?cat=${cat.id}`;
      navItemsHTML += `
        <a class="nav-link ${currentPath === pageLink ? "active" : ""}" href="${pageLink}">${cat.name}</a>
      `;
    });

    navItemsHTML += `
      <a class="nav-link ${currentPath === "admin.html" ? "active" : ""}" href="admin.html">Admin Portal</a>
    `;

    headerContainer.innerHTML = `
      <header>
        <div class="container navbar">
          <a class="logo" href="index.html">
            ${logoContent}
          </a>
          <nav class="nav-links">
            ${navItemsHTML}
          </nav>
          <div class="nav-actions">
            <button class="theme-btn" aria-label="Toggle Theme"></button>
            <div class="hamburger" id="hamburger-menu">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
        <div class="mobile-nav" id="mobile-drawer">
          ${navItemsHTML}
        </div>
      </header>
    `;

    // Hook up responsive event listeners
    const hamburger = document.getElementById("hamburger-menu");
    const drawer = document.getElementById("mobile-drawer");
    if (hamburger && drawer) {
      hamburger.addEventListener("click", () => {
        drawer.classList.toggle("open");
        hamburger.classList.toggle("active");
        
        // Animated hamburger lines
        const lines = hamburger.querySelectorAll("span");
        if (hamburger.classList.contains("active")) {
          lines[0].style.transform = "rotate(45deg) translate(5px, 5px)";
          lines[1].style.opacity = "0";
          lines[2].style.transform = "rotate(-45deg) translate(5px, -5px)";
        } else {
          lines[0].style.transform = "none";
          lines[1].style.opacity = "1";
          lines[2].style.transform = "none";
        }
      });
    }

    // Hook up theme buttons
    const themeBtns = document.querySelectorAll(".theme-btn");
    themeBtns.forEach(btn => btn.addEventListener("click", toggleTheme));
    updateThemeIcon(document.documentElement.getAttribute("data-theme"));
  }

  // Build Footer HTML
  const footerContainer = document.getElementById("footer-container");
  if (footerContainer) {
    footerContainer.innerHTML = `
      <footer>
        <div class="container footer-grid">
          <div class="footer-brand">
            <div class="footer-logo">${settings.logoText || settings.name}</div>
            <div class="footer-description">Your complete technical center for latest reviews, software updates, online hardware store, and professional device repair tutorials. Optimized for speed and security.</div>
          </div>
          <div>
            <h4 class="footer-heading">Services</h4>
            <ul class="footer-links">
              <li><a class="footer-link" href="news.html">Tech News</a></li>
              <li><a class="footer-link" href="repair.html">Repair Manuals</a></li>
              <li><a class="footer-link" href="store.html">Digital Store</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer-heading">Company</h4>
            <ul class="footer-links">
              <li><a class="footer-link" href="about.html">About Us</a></li>
              <li><a class="footer-link" href="contact.html">Contact Us</a></li>
              <li><a class="footer-link" href="admin.html">Admin Portal</a></li>
            </ul>
          </div>
          <div>
            <h4 class="footer-heading">Legal</h4>
            <ul class="footer-links">
              <li><a class="footer-link" href="privacy.html">Privacy Policy</a></li>
              <li><a class="footer-link" href="terms.html">Terms & Conditions</a></li>
              <li><a class="footer-link" href="disclaimer.html">Disclaimer</a></li>
            </ul>
          </div>
        </div>
        <div class="container footer-bottom">
          <div>&copy; ${new Date().getFullYear()} ${settings.name}. All Rights Reserved.</div>
          <div class="footer-socials">
            ${settings.socialFb ? `<a class="footer-link footer-social-icon" href="${settings.socialFb}" target="_blank" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>` : ""}
            ${settings.socialX ? `<a class="footer-link footer-social-icon" href="${settings.socialX}" target="_blank" aria-label="X (Twitter)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg></a>` : ""}
          </div>
        </div>
      </footer>
    `;
  }
}

// Automatically load page content for statutory pages
export async function loadPageContent() {
  const path = window.location.pathname.split("/").pop();
  const pageMap = {
    "about.html": "about",
    "privacy.html": "privacy",
    "terms.html": "terms",
    "disclaimer.html": "disclaimer",
    "contact.html": "contact"
  };

  const key = pageMap[path];
  if (!key) return;

  const contentContainer = document.getElementById("page-content-dynamic");
  if (!contentContainer) return;

  // Add a nice loading state
  contentContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Loading content...</div>`;

  const pagesData = await getPagesContent();
  if (pagesData && pagesData[key]) {
    contentContainer.innerHTML = pagesData[key];
  } else {
    contentContainer.innerHTML = `<p>Error loading page content. Please configure this page in the Admin Portal.</p>`;
  }
}

// Initial script runner
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderCommonComponents();
  loadPageContent();
});

// TechHub Admin Portal Controller (admin.js)
// Orchestrates Admin logins, dashboard stats, uploader states, and CRUD operations

import { 
  loginAdmin, 
  logoutAdmin, 
  checkAuthState, 
  registerFirstAdmin, 
  checkIfAdminRegistered, 
  markAdminAsRegistered,
  getSiteSettings,
  saveSiteSettings,
  getPagesContent,
  savePagesContent,
  getPosts,
  addPost,
  updatePost,
  deletePost,
  uploadImageFile
} from "./firebase-db.js";

import { showToast } from "./shared.js";
import { formatDate } from "./app.js";

// Global variables for dashboard state
let adminRegistered = true;
let dbPosts = [];
let editPostId = "";

// Image upload slots tracking (holds Files or URLs)
let selectedFiles = [null, null, null, null];
let existingImageUrls = ["", "", "", ""];

// -------------------------------------------------------------
// Authentication & Initialization
// -------------------------------------------------------------

async function initAdminPortal() {
  // Check if this is a first-time system setup
  adminRegistered = await checkIfAdminRegistered();
  
  if (!adminRegistered) {
    console.log("Setting up default admin account: admin@techhub.com / admin123");
    try {
      // Silently register default administrator in the background
      await registerFirstAdmin("admin@techhub.com", "admin123");
      await markAdminAsRegistered();
      console.log("Default admin account registered successfully!");
    } catch (error) {
      console.log("Admin registration skipped or user already exists:", error.message);
      // Always mark as registered to avoid re-triggering this operation
      await markAdminAsRegistered();
    }
  }

  // Monitor auth state changes
  checkAuthState((user) => {
    const loginSection = document.getElementById("admin-login-section");
    const dashboardSection = document.getElementById("admin-dashboard-section");

    if (user) {
      // User is logged in
      loginSection.style.display = "none";
      dashboardSection.style.display = "grid";
      
      // Load administrative configurations
      loadDashboard();
      setupMenuNavigation();
      setupEventListeners();
    } else {
      // User is logged out
      loginSection.style.display = "block";
      dashboardSection.style.display = "none";
      setupLoginListener();
    }
  });
}

function setupLoginListener() {
  const loginForm = document.getElementById("admin-login-form");
  if (!loginForm) return;

  // Clone form to clear old event listeners
  const newForm = loginForm.cloneNode(true);
  loginForm.parentNode.replaceChild(newForm, loginForm);

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;
    const submitBtn = document.getElementById("btn-login-submit");

    submitBtn.innerText = "Signing In...";
    submitBtn.disabled = true;

    try {
      // Normal login
      await loginAdmin(email, password);
      showToast("Signed in successfully!", "success");
    } catch (error) {
      console.error("Authentication failed:", error);
      let errMsg = "Authentication failed. Check details.";
      if (error.code === "auth/invalid-email") errMsg = "Invalid email format.";
      if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found" || error.code === "auth/invalid-credential") errMsg = "Incorrect email or password.";
      showToast(errMsg, "danger");
    } finally {
      submitBtn.innerText = "Sign In";
      submitBtn.disabled = false;
    }
  });
}

// -------------------------------------------------------------
// Side Menu Navigation
// -------------------------------------------------------------

function setupMenuNavigation() {
  const menuButtons = document.querySelectorAll(".admin-menu-item");
  const sections = document.querySelectorAll(".admin-section");

  menuButtons.forEach(btn => {
    if (btn.classList.contains("admin-logout")) return;
    
    btn.addEventListener("click", () => {
      // Toggle button active states
      menuButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Switch work panels
      const targetSectionId = btn.dataset.target;
      sections.forEach(sec => {
        sec.classList.remove("active");
        if (sec.id === targetSectionId) {
          sec.classList.add("active");
        }
      });
    });
  });

  // Logout button trigger
  document.getElementById("btn-admin-logout").onclick = async () => {
    await logoutAdmin();
    showToast("Signed out of admin dashboard", "success");
  };
}

// -------------------------------------------------------------
// Dashboard Operations
// -------------------------------------------------------------

async function loadDashboard() {
  dbPosts = await getPosts();
  
  // Calculate summary stats
  const totalPosts = dbPosts.length;
  const storeItems = dbPosts.filter(p => p.category === "store").length;
  const totalViews = dbPosts.reduce((acc, curr) => acc + (curr.views || 0), 0);

  document.getElementById("stat-total-posts").innerText = totalPosts;
  document.getElementById("stat-total-store").innerText = storeItems;
  document.getElementById("stat-total-views").innerText = totalViews;

  renderAdminPostsTable();
  loadSiteSettings();
  loadPolicyPages();
}

function renderAdminPostsTable() {
  const tbody = document.getElementById("admin-posts-table-body");
  if (!tbody) return;

  if (dbPosts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 40px;">No articles published yet. Click Add New Post to start.</td>
      </tr>
    `;
    return;
  }

  const categoryNames = {
    "tech-news": "Tech News",
    "repair-articles": "Repair Articles",
    "store": "Store"
  };

  tbody.innerHTML = dbPosts.map(post => {
    const thumb = post.images && post.images.length > 0 && post.images[0]
      ? post.images[0]
      : "https://images.unsplash.com/photo-1531297484001-80022131f5a1?q=80&w=150&auto=format&fit=crop";

    return `
      <tr id="admin-row-${post.id}">
        <td>
          <div class="table-post-title-cell">
            <img class="table-post-img" src="${thumb}" alt="" loading="lazy">
            <span class="table-title-text">${post.title}</span>
          </div>
        </td>
        <td>
          <span style="font-weight: 500;">${categoryNames[post.category] || post.category}</span>
        </td>
        <td>${formatDate(post.createdAt)}</td>
        <td>
          <span style="font-weight: 600;">${post.views || 0}</span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="action-icon-btn btn-edit" data-id="${post.id}" title="Edit Article">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"></path></svg>
            </button>
            <button class="action-icon-btn btn-delete" data-id="${post.id}" title="Delete Article">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-1.816A2.25 2.25 0 0112.24 2h-2.48a2.25 2.25 0 01-2.24 2.24v1.816m7.5 0a48.11 48.11 0 01-7.5 0"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Attach event click handlers to table buttons
  tbody.querySelectorAll(".btn-delete").forEach(btn => {
    btn.onclick = async (e) => {
      const id = btn.dataset.id;
      const targetPost = dbPosts.find(p => p.id === id);
      if (confirm(`Are you sure you want to permanently delete "${targetPost.title}"?`)) {
        try {
          await deletePost(id);
          showToast("Article deleted successfully!", "success");
          loadDashboard();
        } catch (error) {
          showToast("Failed to delete post", "danger");
        }
      }
    };
  });

  tbody.querySelectorAll(".btn-edit").forEach(btn => {
    btn.onclick = (e) => {
      const id = btn.dataset.id;
      openPostEditorModal(id);
    };
  });
}

// -------------------------------------------------------------
// Site Settings & Branding
// -------------------------------------------------------------

async function loadSiteSettings() {
  const settings = await getSiteSettings();
  if (!settings) return;

  // Fill in inputs
  document.getElementById("set-site-name").value = settings.name || "";
  document.getElementById("set-logo-text").value = settings.logoText || "";
  document.getElementById("set-logo-url").value = settings.logoUrl || "";
  document.getElementById("set-email").value = settings.contactEmail || "";
  document.getElementById("set-phone").value = settings.contactPhone || "";
  document.getElementById("set-social-fb").value = settings.socialFb || "";
  document.getElementById("set-social-x").value = settings.socialX || "";

  // Render categories management layout
  const categoriesListInputs = document.getElementById("categories-list-inputs");
  if (categoriesListInputs) {
    const cats = settings.categories || [];
    categoriesListInputs.innerHTML = cats.map(cat => `
      <div class="category-manager-item" data-cat-id="${cat.id}">
        <div class="category-manager-info">
          <span style="font-weight: 700; font-size: 13px; color: var(--text-muted); text-transform: uppercase;">ID: ${cat.id}</span>
          <input type="text" class="category-input-field" value="${cat.name}" required>
        </div>
      </div>
    `).join("");
  }
}

// -------------------------------------------------------------
// Policy Pages
// -------------------------------------------------------------

async function loadPolicyPages() {
  const pages = await getPagesContent();
  if (!pages) return;

  document.getElementById("page-about").value = pages.about || "";
  document.getElementById("page-contact").value = pages.contact || "";
  document.getElementById("page-privacy").value = pages.privacy || "";
  document.getElementById("page-terms").value = pages.terms || "";
  document.getElementById("page-disclaimer").value = pages.disclaimer || "";
}

// -------------------------------------------------------------
// Image Uploader Dynamic Box Previews
// -------------------------------------------------------------

function resetUploaderStates() {
  selectedFiles = [null, null, null, null];
  existingImageUrls = ["", "", "", ""];
  
  for (let idx = 0; idx < 4; idx++) {
    const box = document.getElementById(`img-box-${idx}`);
    if (box) {
      box.innerHTML = `
        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Select Image</span>
        <input type="file" class="post-img-input" accept="image/*" style="display: none;" id="file-input-${idx}">
      `;
      setupBoxFileTriggers(idx);
    }
    // Clear manual url field
    const urlField = document.getElementById(`post-img-url-${idx}`);
    if (urlField) urlField.value = "";
  }
}

function renderBoxPreview(idx, fileOrUrl) {
  const box = document.getElementById(`img-box-${idx}`);
  if (!box) return;

  let source = "";
  if (fileOrUrl instanceof File) {
    source = URL.createObjectURL(fileOrUrl);
  } else {
    source = fileOrUrl;
  }

  box.innerHTML = `
    <img class="image-preview-img" src="${source}" alt="Preview ${idx + 1}">
    <div class="remove-img-btn" data-index="${idx}" title="Remove image">&times;</div>
  `;

  // Attach deletion action
  box.querySelector(".remove-img-btn").onclick = (e) => {
    e.stopPropagation(); // Avoid triggering click uploader again
    
    // Clear selections
    selectedFiles[idx] = null;
    existingImageUrls[idx] = "";
    
    // Reset to uploader layout
    box.innerHTML = `
      <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span>Select Image</span>
      <input type="file" class="post-img-input" accept="image/*" style="display: none;" id="file-input-${idx}">
    `;
    setupBoxFileTriggers(idx);
    
    // Reset manual input URL if matching
    const urlField = document.getElementById(`post-img-url-${idx}`);
    if (urlField) urlField.value = "";
  };
}

function setupBoxFileTriggers(idx) {
  const box = document.getElementById(`img-box-${idx}`);
  if (!box) return;

  box.onclick = () => {
    const input = document.getElementById(`file-input-${idx}`);
    if (input) input.click();
  };

  const input = document.getElementById(`file-input-${idx}`);
  if (input) {
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        selectedFiles[idx] = file;
        renderBoxPreview(idx, file);
      }
    };
  }
}

// -------------------------------------------------------------
// Dialog Modals Setup
// -------------------------------------------------------------

function openPostEditorModal(id = "") {
  editPostId = id;
  const modal = document.getElementById("post-editor-modal");
  const form = document.getElementById("post-editor-form");
  const title = document.getElementById("modal-editor-title");
  const submitBtn = document.getElementById("btn-save-post");

  form.reset();
  resetUploaderStates();

  if (id) {
    // Editing an existing post
    title.innerText = "Edit Article";
    submitBtn.innerText = "Save Changes";
    document.getElementById("edit-post-id").value = id;

    const postData = dbPosts.find(p => p.id === id);
    if (postData) {
      document.getElementById("post-category").value = postData.category;
      document.getElementById("post-title").value = postData.title;
      document.getElementById("post-description").value = postData.description;
      document.getElementById("post-link").value = postData.link || "";
      document.getElementById("post-download").value = postData.downloadLink || "";

      // Handle price check
      if (postData.category === "store") {
        document.getElementById("post-price-field").style.display = "flex";
        document.getElementById("post-price").value = postData.price || "";
      } else {
        document.getElementById("post-price-field").style.display = "none";
      }

      // Populate images previews
      if (postData.images && postData.images.length > 0) {
        postData.images.forEach((img, idx) => {
          if (img && idx < 4) {
            existingImageUrls[idx] = img;
            renderBoxPreview(idx, img);
            // Fill backup urls
            const urlField = document.getElementById(`post-img-url-${idx}`);
            if (urlField) urlField.value = img;
          }
        });
      }
    }
  } else {
    // Add new post
    title.innerText = "Create New Article";
    submitBtn.innerText = "Publish Post";
    document.getElementById("edit-post-id").value = "";
    document.getElementById("post-price-field").style.display = "none";
  }

  modal.classList.add("open");
}

function closePostEditorModal() {
  const modal = document.getElementById("post-editor-modal");
  modal.classList.remove("open");
  editPostId = "";
}

// -------------------------------------------------------------
// Submit Handlers & Event Listeners
// -------------------------------------------------------------

function setupEventListeners() {
  // Bind category select display change (Store price toggling)
  const catSelect = document.getElementById("post-category");
  if (catSelect) {
    catSelect.onchange = (e) => {
      const priceField = document.getElementById("post-price-field");
      if (e.target.value === "store") {
        priceField.style.display = "flex";
      } else {
        priceField.style.display = "none";
        document.getElementById("post-price").value = "";
      }
    };
  }

  // Bind dialog toggles
  document.getElementById("btn-open-add-post").onclick = () => openPostEditorModal();
  document.getElementById("btn-close-modal").onclick = closePostEditorModal;
  document.getElementById("btn-cancel-modal").onclick = closePostEditorModal;

  // Add/Edit Post submission
  const postForm = document.getElementById("post-editor-form");
  postForm.onsubmit = async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("btn-save-post");
    const originalText = submitBtn.innerText;
    
    submitBtn.innerText = "Uploading & Saving...";
    submitBtn.disabled = true;

    try {
      const category = document.getElementById("post-category").value;
      const title = document.getElementById("post-title").value;
      const description = document.getElementById("post-description").value;
      const link = document.getElementById("post-link").value;
      const downloadLink = document.getElementById("post-download").value;
      const price = category === "store" ? document.getElementById("post-price").value : null;

      // Handle dynamic images array
      const imageUrls = [...existingImageUrls];

      for (let idx = 0; idx < 4; idx++) {
        // If a new local file is chosen in this slot, upload it
        if (selectedFiles[idx]) {
          const uploadedUrl = await uploadImageFile(selectedFiles[idx]);
          imageUrls[idx] = uploadedUrl;
        } else {
          // If no local uploader file, check advanced input link field as fallback
          const manualUrl = document.getElementById(`post-img-url-${idx}`).value;
          if (manualUrl && manualUrl.trim() !== "") {
            imageUrls[idx] = manualUrl.trim();
          }
        }
      }

      // Filter empty items
      const finalImages = imageUrls.filter(url => url && url.trim() !== "");

      const postData = {
        category,
        title,
        description,
        link,
        downloadLink,
        price: price ? parseFloat(price) : null,
        images: finalImages
      };

      if (editPostId) {
        // Update database item
        await updatePost(editPostId, postData);
        showToast("Article updated successfully!", "success");
      } else {
        // Add new database item
        await addPost(postData);
        showToast("Article published successfully!", "success");
      }

      closePostEditorModal();
      loadDashboard();
    } catch (error) {
      console.error("Failed to save post:", error);
      showToast("Error saving article details.", "danger");
    } finally {
      submitBtn.innerText = originalText;
      submitBtn.disabled = false;
    }
  };

  // Site Settings Brand Form
  const brandForm = document.getElementById("settings-brand-form");
  brandForm.onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("btn-save-settings");
    saveBtn.innerText = "Saving Settings...";
    saveBtn.disabled = true;

    try {
      const data = {
        name: document.getElementById("set-site-name").value,
        logoText: document.getElementById("set-logo-text").value,
        logoUrl: document.getElementById("set-logo-url").value,
        contactEmail: document.getElementById("set-email").value,
        contactPhone: document.getElementById("set-phone").value,
        socialFb: document.getElementById("set-social-fb").value,
        socialX: document.getElementById("set-social-x").value
      };

      await saveSiteSettings(data);
      showToast("Global branding settings updated!", "success");
      
      // Reload navbar/footer
      window.location.reload();
    } catch (error) {
      showToast("Failed to save site settings", "danger");
    } finally {
      saveBtn.innerText = "Save Branding Details";
      saveBtn.disabled = false;
    }
  };

  // Categories Editor Form
  const categoriesForm = document.getElementById("categories-edit-form");
  categoriesForm.onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("btn-save-categories");
    saveBtn.innerText = "Updating Categories...";
    saveBtn.disabled = true;

    try {
      const catItems = document.querySelectorAll(".category-manager-item");
      const categoriesArray = [];
      
      catItems.forEach(item => {
        const id = item.dataset.catId;
        const name = item.querySelector(".category-input-field").value;
        categoriesArray.push({ id, name });
      });

      await saveSiteSettings({ categories: categoriesArray });
      showToast("Category names updated successfully!", "success");
      
      // Reload navbar/footer
      window.location.reload();
    } catch (error) {
      showToast("Failed to save category alterations", "danger");
    } finally {
      saveBtn.innerText = "Save Categories";
      saveBtn.disabled = false;
    }
  };

  // Pages Static Content Form
  const pagesForm = document.getElementById("pages-edit-form");
  pagesForm.onsubmit = async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("btn-save-pages");
    saveBtn.innerText = "Saving Pages...";
    saveBtn.disabled = true;

    try {
      const data = {
        about: document.getElementById("page-about").value,
        contact: document.getElementById("page-contact").value,
        privacy: document.getElementById("page-privacy").value,
        terms: document.getElementById("page-terms").value,
        disclaimer: document.getElementById("page-disclaimer").value
      };

      await savePagesContent(data);
      showToast("Statutory page descriptions saved!", "success");
    } catch (error) {
      showToast("Failed to update page data", "danger");
    } finally {
      saveBtn.innerText = "Save Page Contents";
      saveBtn.disabled = false;
    }
  };

  // Activate box-specific uploaders
  for (let i = 0; i < 4; i++) {
    setupBoxFileTriggers(i);
  }
}

document.addEventListener("DOMContentLoaded", initAdminPortal);

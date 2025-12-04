const backendUrl = "https://castiq.onrender.com";
//const backendUrl = "http://127.0.0.1:8000";
let allCatches = [];
let filteredCatches = [];
let currentPage = 1;
const itemsPerPage = 25;


// Create or load a unique user ID
function getUserId() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = crypto.randomUUID(); // built-in universally unique ID
    localStorage.setItem("userId", userId);
  }
  return userId;
}

const USER_ID = getUserId();

/* -------------------- Home Page: Catches -------------------- */
const catchForm = document.getElementById("catchForm");
const dateInput = document.getElementById("date");
const timeInput = document.getElementById("time");

if (catchForm) {
  /**
   * Event listener for submitting a new catch.
   * Converts form data into an object, applies default date/time if missing,
   * sends it to the backend, and reloads the table.
   */
  catchForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(catchForm);
  const catchData = Object.fromEntries(formData);

  if (!catchData.date) catchData.date = new Date().toISOString().slice(0, 10);
  if (!catchData.time)
    catchData.time = new Date().toLocaleTimeString("en-GB", { hour12: false });

  try {
    const res = await fetch(`${backendUrl}/log-catch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...catchData,
        user_id: USER_ID
      }),
    });

    const result = await res.json();

    if (result.success) {
      catchForm.reset();
      setCurrentDateTime();
      await loadCatches();
      showToast("Catch logged successfully!", "success");
    } else {
      showToast("Failed to log catch.", "error");
    }
  } catch (err) {
    alert("Network or server error: " + err.message);
  }
});


  loadCatches();
}

setCurrentDateTime();

/* -------------------- Load & Render Catches -------------------- */


/**
 * Loads all catches from the backend API and stores them locally.
 * Initializes filteredCatches for searching and renders the table.
 *
 * @param {boolean} keepPage - If true, keeps the current page instead of resetting to 1.
 */
async function loadCatches(keepPage = false) {
  try {
    const res = await fetch(`${backendUrl}/catches?user_id=${USER_ID}`);
    const json = await res.json();
    allCatches = json.data || [];

    // Sort allCatches by date & time descending
    allCatches.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || "00:00"}`);
      const dateTimeB = new Date(`${b.date}T${b.time || "00:00"}`);
      
      if (dateTimeA > dateTimeB) return -1;
      if (dateTimeA < dateTimeB) return 1;

      return b.id - a.id;
    });

    // Re-apply search filter if there is an active search
    if (searchInput?.value) {
      applyCatchFilter();
    } else {
      filteredCatches = [...allCatches];
    }

    const pageToShow = keepPage ? currentPage : 1;
    renderTablePage(pageToShow);

    // Switch tables based on if the user has any data 
      const emptyEl = document.getElementById("emptyMessage");
      const tableEl = document.getElementById("catchesTable");

      if (!allCatches || allCatches.length === 0) {
        emptyEl.style.display = "flex";
        tableEl.style.display = "none";
      } 
      else {
        emptyEl.style.display = "none";
        tableEl.style.display = "";
      }
  } catch (err) {
    console.error("Failed to load catches:", err);
  }
}


/* -------------------- Search Functionality -------------------- */
const searchInput = document.getElementById("search-bar");


searchInput?.addEventListener("input", () => {
  applyCatchFilter();
  renderTablePage(1);
});

function applyCatchFilter() {
  const keyword = searchInput?.value.toLowerCase().trim() || "";

  // Filter first
  filteredCatches = allCatches.filter((c) => {
    const formattedDate = c.date ? formatDate(c.date) : "";
    const formattedTime = c.time ? formatTime(c.time) : "";

    return (
      formattedDate.toLowerCase().includes(keyword) ||
      formattedTime.toLowerCase().includes(keyword) ||
      Object.entries(c).some(([key, val]) => {
        if (key === "date" || key === "time") return false;
        return val !== null && val !== undefined && String(val).toLowerCase().includes(keyword);
      })
    );
  });

  // Sort by date, time, then ID descending
  filteredCatches.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time || "00:00"}`);
    const dateTimeB = new Date(`${b.date}T${b.time || "00:00"}`);
    
    if (dateTimeA > dateTimeB) return -1;
    if (dateTimeA < dateTimeB) return 1;

    return b.id - a.id;
  });
}

  // Sort by date, then time, then ID descending
  filteredCatches.sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time || "00:00"}`);
    const dateTimeB = new Date(`${b.date}T${b.time || "00:00"}`);
    
    if (dateTimeA > dateTimeB) return -1;
    if (dateTimeA < dateTimeB) return 1;

    return b.id - a.id; // newest added first if same date & time
  });


/* -------------------- Table Rendering & Pagination -------------------- */


/**
 * Renders a page of the catches table based on filteredCatches.
 *
 * @param {number} page - The page number to display.
 */
function renderTablePage(page) {
  currentPage = page;
  const tbody = document.querySelector("#catchesTable tbody");
  tbody.innerHTML = "";


  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageData = filteredCatches.slice(start, end);


  pageData.forEach((catchItem) => {
    const tr = document.createElement("tr");


    const formattedDate = catchItem.date ? formatDate(catchItem.date) : "";
    const formattedTime = catchItem.time ? formatTime(catchItem.time) : "";


    tr.innerHTML = `
      <td>${formattedDate}</td>
      <td>${formattedTime}</td>
      <td>${escapeHtml(catchItem.location)}</td>
      <td>${escapeHtml(catchItem.species)}</td>
      <td>${catchItem.length_in ?? ""}</td>
      <td>${catchItem.weight_lbs ?? ""}</td>
      <td>${catchItem.temperature ?? ""}</td>
      <td>${escapeHtml(catchItem.bait || "")}</td>
      <td>
        <button class="edit" onclick='openEditForm(${JSON.stringify(catchItem)})'>Edit</button>
        <button class="delete" onclick='deleteCatch(${catchItem.id})'>Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });


  updatePaginationControls();
}


/**
 * Updates pagination buttons and current page display.
 */
function updatePaginationControls() {
  const totalPages = Math.ceil(filteredCatches.length / itemsPerPage);

  // If there is no data, show Page 0 of 0 and disable buttons
  if (filteredCatches.length === 0) {
    document.getElementById("pageInfo").textContent = "Page 0 of 0";
    document.getElementById("prevPage").disabled = true;
    document.getElementById("nextPage").disabled = true;
  } 
  else {
    document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById("prevPage").disabled = currentPage === 1;
    document.getElementById("nextPage").disabled = currentPage === totalPages;
  }
}


/**
 * Scrolls smoothly to the top of the table section.
 */
function scrollToTableTop() {
  const tableSection = document.querySelector(".catches-wrap");
  const y = tableSection.getBoundingClientRect().top + window.pageYOffset;
  window.scrollTo({ top: y });
}


// Pagination button events
document.getElementById("prevPage")?.addEventListener("click", () => {
  if (currentPage > 1) {
    renderTablePage(currentPage - 1);
    scrollToTableTop();
  }
});


document.getElementById("nextPage")?.addEventListener("click", () => {
  const totalPages = Math.ceil(filteredCatches.length / itemsPerPage);
  if (currentPage < totalPages) {
    renderTablePage(currentPage + 1);
    scrollToTableTop();
  }
});


/* -------------------- Utility Functions -------------------- */


/**
 * Escapes HTML characters to prevent injection when rendering strings.
 *
 * @param {string} text - The text to escape.
 * @returns {string} Escaped text safe for HTML.
 */
function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]));
}

/**
 * sets the date and time pickers to be the current date and time
 */
function setCurrentDateTime() {
  const now = new Date();
  dateInput.value = now.toLocaleDateString('en-CA');
  timeInput.value = now.toTimeString().slice(0, 5);
}



/* -------------------- alert message -------------------- */

function showToast(message, type = "success", duration = 3000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add("show"));

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}


/* -------------------- Delete Catch -------------------- */


/**
 * Sends a DELETE request to remove a catch by ID.
 *
 * @param {number} id - The ID of the catch to delete.
 */
async function deleteCatch(id) {
  try {
    const res = await fetch(`${backendUrl}/delete-catch/${id}?user_id=${USER_ID}`, {method: "DELETE",});
    const result = await res.json();


    if (result.success){
      loadCatches(true);
      showToast("Catch deleted successfully!", "success");
    }
    else{
      showToast("Failed to delete catch.", "error");
    }
  } catch (err) {
    alert("Network or server error: " + err.message);
  }
}


/* -------------------- Edit Catch Modal -------------------- */

/**
 * Opens the edit modal and populates it with a catch's data.
 *
 * @param {Object} catchItem - The catch object to edit.
 */

function openEditForm(catchItem) {
   const modal = document.getElementById("editModal");
  modal.removeAttribute("inert");
  modal.style.display = "flex";


  let cleanTime = catchItem.time || "";
  if (cleanTime.includes(":")) cleanTime = cleanTime.split(":").slice(0, 2).join(":");


  document.getElementById("editId").value = catchItem.id;
  document.getElementById("editDate").value = catchItem.date || "";
  document.getElementById("editTime").value = cleanTime;
  document.getElementById("editLocation").value = catchItem.location || "";
  document.getElementById("editSpecies").value = catchItem.species || "";
  document.getElementById("editLength").value =
  catchItem.length_in != null ? catchItem.length_in : "";
  document.getElementById("editWeight").value =
  catchItem.weight_lbs != null ? catchItem.weight_lbs : "";
  document.getElementById("editTemperature").value =
  catchItem.temperature != null ? catchItem.temperature : "";
  document.getElementById("editBait").value = catchItem.bait || "";
}


/*
 * Closes the edit modal.
 */
function closeEditForm() {
  const modal = document.getElementById("editModal");
  modal.setAttribute("inert", "");
  modal.style.display = "none";
}


const editForm = document.getElementById("editForm");


if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editId").value;

    const payload = {
      date: document.getElementById("editDate").value,
      time: document.getElementById("editTime").value,
      location: document.getElementById("editLocation").value,
      species: document.getElementById("editSpecies").value,
      length_in: (() => { const v = parseFloat(document.getElementById("editLength").value); return Number.isFinite(v) ? v : document.getElementById("editLength").value; })(),
      weight_lbs: (() => { const v = parseFloat(document.getElementById("editWeight").value); return Number.isFinite(v) ? v : document.getElementById("editWeight").value; })(),
      temperature: (() => { const v = parseFloat(document.getElementById("editTemperature").value); return Number.isFinite(v) ? v : document.getElementById("editTemperature").value; })(),
      bait: document.getElementById("editBait").value,
    };

    // Log payload we are about to send
    console.log("PUT payload:", payload);

    try {
      const res = await fetch(`${backendUrl}/edit-catch/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...payload, user_id: USER_ID,}),
      });

      // Always capture raw response text to see validation details even if not valid JSON
      const raw = await res.text();
      console.log("PUT response status:", res.status);
      console.log("RESPONSE TEXT:", raw);

      if (!res.ok) {
        alert(`Update failed: ${res.status} — check console for details.`);
        showToast("Failed to update catch.", "error");
      } 
      else {
        // success path
        closeEditForm();
        if (typeof loadCatches === "function") { 
          await loadCatches(true);
          renderTablePage(currentPage);
          showToast("Catch updated successfully!", "success");
        }
      }
    } catch (err) {
      console.error("Network error while updating catch:", err);
      alert("Network error — see console.");
    }
  });
}



// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeEditForm();
});


/* -------------------- Date & Time Formatting -------------------- */


/**
 * Converts ISO date string to "MM/DD/YYYY" format.
 *
 * @param {string} isoDate - ISO-formatted date string.
 * @returns {string} Formatted date string.
 */
function formatDate(isoDate) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}


/**
 * Converts time string "HH:MM" to formatted 12-hour string with AM/PM.
 *
 * @param {string} timeString - Time string in "HH:MM" format.
 * @returns {string} Formatted time string like "2:30 PM".
 */
function formatTime(timeString) {
  if (!timeString) return "";
  let [hour, minute] = timeString.split(":").map(Number);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute.toString().padStart(2, "0")} ${ampm}`;
}


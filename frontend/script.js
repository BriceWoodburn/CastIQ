const backendUrl = "https://castiq.onrender.com";
//const backendUrl = "http://127.0.0.1:8000";
let allCatches = [];
let filteredCatches = [];
let currentPage = 1;
const itemsPerPage = 25;


/* -------------------- Home Page: Catches -------------------- */
const catchForm = document.getElementById("catchForm");

let datePicker, timePicker, editDatePicker, editTimePicker;

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Flatpickr once for log form
  datePicker = flatpickr("#datePicker", { dateFormat: "m/d/Y" });
  timePicker = flatpickr("#timePicker", { enableTime: true, noCalendar: true, dateFormat: "h:i K" });

  // Initialize Flatpickr once for edit modal
  editDatePicker = flatpickr("#editDate", { dateFormat: "m/d/Y" });
  editTimePicker = flatpickr("#editTime", { enableTime: true, noCalendar: true, dateFormat: "h:i K" });
});

if (catchForm) {
  catchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(catchForm);
    const catchData = Object.fromEntries(formData.entries());

    // Convert visible Flatpickr inputs to backend format
    const visibleDate = (document.getElementById("datePicker")?.value || "").trim();
    const visibleTime = (document.getElementById("timePicker")?.value || "").trim();

    if (visibleDate) catchData.date = convertDateToISO(visibleDate);
    if (visibleTime) catchData.time = convertTimeTo24(visibleTime);

    // Set defaults if empty
    if (!catchData.date) catchData.date = new Date().toISOString().slice(0, 10);
    if (!catchData.time) catchData.time = new Date().toLocaleTimeString("en-GB", { hour12: false });

    try {
      const res = await fetch(`${backendUrl}/log-catch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catchData),
      });

      const result = await res.json();

      if (result.success) {
        catchForm.reset();
        await loadCatches();
      } else {
        alert("❌ Error logging catch: " + JSON.stringify(result));
      }
    } catch (err) {
      alert("❌ Network or server error: " + err.message);
    }
  });

  loadCatches();
}


/* -------------------- Load & Render Catches -------------------- */


/**
 * Loads all catches from the backend API and stores them locally.
 * Initializes filteredCatches for searching and renders the table.
 *
 * @param {boolean} keepPage - If true, keeps the current page instead of resetting to 1.
 */
async function loadCatches(keepPage = false) {
  try {
    const res = await fetch(`${backendUrl}/catches`);
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
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}


/**
 * Scrolls smoothly to the top of the table section.
 */
function scrollToTableTop() {
  const tableSection = document.querySelector(".catches-wrap");
  if (tableSection) tableSection.scrollIntoView({ behavior: "smooth" });
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

function convertDateToISO(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.trim().split("/");
  if (parts.length !== 3) return "";
  const [month, day, year] = parts.map(p => p.padStart(2, "0"));
  return `${year}-${month}-${day}`;
}

function convertTimeTo24(timeStr) {
  if (!timeStr) return "";
  timeStr = timeStr.trim();
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!match) {
    const alt = timeStr.split(":");
    if (alt.length === 2) {
      return `${alt[0].padStart(2, "0")}:${alt[1].padStart(2, "0")}`;
    }
    return "";
  }
  let [, hr, min, mod] = match;
  hr = Number(hr);
  min = String(min).padStart(2, "0");
  if (mod) {
    mod = mod.toUpperCase();
    if (mod === "PM" && hr !== 12) hr += 12;
    if (mod === "AM" && hr === 12) hr = 0;
  }
  return `${String(hr).padStart(2, "0")}:${min}`;
}

/* -------------------- Delete Catch -------------------- */


/**
 * Sends a DELETE request to remove a catch by ID.
 *
 * @param {number} id - The ID of the catch to delete.
 */
async function deleteCatch(id) {
  try {
    const res = await fetch(`${backendUrl}/delete-catch/${id}`, { method: "DELETE" });
    const result = await res.json();


    if (result.success) loadCatches(true);
    else alert("Error deleting catch: " + (result.message || "Unknown error"));
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
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");

  // Set date/time in Flatpickr
  editDatePicker.setDate(catchItem.date || new Date(), true, "Y-m-d");
  editTimePicker.setDate(catchItem.time || new Date(), true, "H:i");

  document.getElementById("editId").value = catchItem.id;
  document.getElementById("editLocation").value = catchItem.location || "";
  document.getElementById("editSpecies").value = catchItem.species || "";
  document.getElementById("editLength").value = catchItem.length_in ?? "";
  document.getElementById("editWeight").value = catchItem.weight_lbs ?? "";
  document.getElementById("editTemperature").value = catchItem.temperature ?? "";
  document.getElementById("editBait").value = catchItem.bait || "";
}

const editForm = document.getElementById("editForm");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editId").value;

    // Get Flatpickr inputs in backend-friendly format
    let dateForBackend = editDatePicker.input.value ? convertDateToISO(editDatePicker.input.value) : new Date().toISOString().slice(0, 10);
    let timeForBackend = editTimePicker.input.value ? convertTimeTo24(editTimePicker.input.value) : new Date().toLocaleTimeString("en-GB", { hour12: false });

    const payload = {
      date: dateForBackend,
      time: timeForBackend,
      location: document.getElementById("editLocation").value,
      species: document.getElementById("editSpecies").value,
      length_in: (() => { const v = parseFloat(document.getElementById("editLength").value); return Number.isFinite(v) ? v : document.getElementById("editLength").value; })(),
      weight_lbs: (() => { const v = parseFloat(document.getElementById("editWeight").value); return Number.isFinite(v) ? v : document.getElementById("editWeight").value; })(),
      temperature: (() => { const v = parseFloat(document.getElementById("editTemperature").value); return Number.isFinite(v) ? v : document.getElementById("editTemperature").value; })(),
      bait: document.getElementById("editBait").value,
    };

    console.log("PUT payload:", payload);

    try {
      const res = await fetch(`${backendUrl}/edit-catch/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      console.log("PUT response status:", res.status);
      console.log("RESPONSE TEXT:", raw);

      if (!res.ok) {
        alert(`Update failed: ${res.status} — check console for details.`);
      } else {
        closeEditForm();
        await loadCatches(true);
        renderTablePage(currentPage);
      }
    } catch (err) {
      console.error("Network error while updating catch:", err);
      alert("Network error — see console.");
    }
  });
}

function closeEditForm() {
  const modal = document.getElementById("editModal");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}


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
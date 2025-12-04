const backendUrl = "https://castiq.onrender.com";
//const backendUrl = "http://127.0.0.1:8000";
let chartInstance = null;


/* -------------------- Data Fetching -------------------- */

function getUserId() {
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
  }
  return userId;
}
const USER_ID = getUserId();

/**
 * Fetches all catches from the backend API.
 *
 * @returns {Promise<Array>} Array of catch objects, or empty array on error.
 */
async function fetchCatches() {
   try {
    const res = await fetch(`${backendUrl}/catches?user_id=${USER_ID}`);
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("Error fetching catches:", err);
    return [];
  }
}


/* -------------------- Chart Rendering -------------------- */


/**
 * Renders a chart based on the selected type.
 *
 * Supported types:
 * - speciesCountChart: Number of catches per species.
 * - catchesOverTimeChart: Total catches over time.
 * - averageWeightChart: Average weight per species.
 * - baitUsageChart: Number of catches per bait type.
 * - averageLengthChart: Average length per species.
 *
 * @param {string} chartType - The type of chart to render.
 */
async function renderChart(chartType) {
  const data = await fetchCatches();

  // Handle empty data message
  const emptyEl = document.getElementById("chartEmptyMessage");
  const canvas = document.getElementById("chartCanvas");

  if (!data.length) {
    emptyEl.style.display = "flex";
    canvas.style.display = "none";
    if (chartInstance) chartInstance.destroy();
    return;
  } 
  else {
    emptyEl.style.display = "none";
    canvas.style.display = "block";
  }

  if (!data.length) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  const wrapper = canvas.parentElement;

  const containerWidth = wrapper.clientWidth;
  const minWidth = 900;

  canvas.width = Math.max(containerWidth, minWidth);
  canvas.height = 600;

  const ctx = canvas.getContext("2d");


  if (chartInstance) chartInstance.destroy();


  switch (chartType) {
    /* -------------------- Species Count Chart -------------------- */
    case "speciesCountChart": {
      const speciesCounts = {};
      data.forEach((c) => {
        speciesCounts[c.species] = (speciesCounts[c.species] || 0) + 1;
      });


       chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: Object.keys(speciesCounts),
          datasets: [
            {
              label: "Number of Fish Caught",
              data: Object.values(speciesCounts),
              backgroundColor: "rgba(54,162,235,0.6)",
              borderColor: "rgba(54,162,235,1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: {
                  size: 16,
                },
                color: '#000000'
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Species", font: { size: 16 }, color: '#000000'},
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: { color: '#777777' }
            },
            y: {
              title: { display: true, text: "Fish Caught", font: { size: 16 }, color: '#000000'},
              beginAtZero: true,
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: { color: '#777777' }
            }
          }
        },
      });
    }


    /* -------------------- Catches Over Time Chart -------------------- */
    case "catchesOverTimeChart": {
      const catchesByDate = {};
      data.forEach((c) => {
        const date = c.date ? c.date.split("T")[0] : "Unknown";
        catchesByDate[date] = (catchesByDate[date] || 0) + 1;
      });


      const dates = Object.keys(catchesByDate).sort();
      const counts = dates.map((d) => catchesByDate[d]);


      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: dates,
          datasets: [
            {
              label: "Catches Over Time",
              data: counts,
              borderColor: "rgba(75,192,192,1)",
              fill: false,
              tension: 0.25,
              pointBackgroundColor: "rgba(75,192,192,1)",
              backgroundColor: "rgba(75,192,192,1)"
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: {
                  size: 16,
                },
                color: '#000000',
                usePointStyle: false, 
                boxWidth: 20,
                boxHeight: 20
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Date", font: { size: 16 }, color: '#000000'},
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: { color: '#777777' }
            },
            y: {
              beginAtZero: true,
              title: { display: true, text: "Catches", font: { size: 16 }, color: '#000000'},
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: { color: '#777777' }
            }
          },
        },
      });
      break;
    }


    /* -------------------- Average Weight Chart -------------------- */
    case "averageWeightChart": {
      const weightSums = {};
      const weightCounts = {};


      data.forEach((c) => {
        if (!c.species || !c.weight_lbs) return;
        weightSums[c.species] = (weightSums[c.species] || 0) + parseFloat(c.weight_lbs);
        weightCounts[c.species] = (weightCounts[c.species] || 0) + 1;
      });


      const species = Object.keys(weightSums);
      const averageWeights = species.map((s) => weightSums[s] / weightCounts[s]);


      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: species,
          datasets: [
            {
              label: "Average Weight (lbs)",
              data: averageWeights,
              backgroundColor: "rgba(255,159,64,0.6)",
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: {
                  size: 16,
                },
                color: '#000000'
              }
            }
          },
          scales: {
            y: {
              title: { display: true, text: "Weight (lbs)", font: { size: 16 }, color: '#000000'},
              beginAtZero: true,
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: {
                color: '#777777'
              }
            },
            x: {
              title: { display: true, text: "Species", font: { size: 16 }, color: '#000000'},
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: {
                color: '#777777'
              }
            }
          },
        },
      });
      break;
    }


    /* -------------------- Bait Usage Chart -------------------- */
    case "baitUsageChart": {
      const baitCounts = {};
      data.forEach((c) => {
        const bait = c.bait || "Unknown";
        baitCounts[bait] = (baitCounts[bait] || 0) + 1;
      });


      chartInstance = new Chart(ctx, {
        type: "pie",
        data: {
          labels: Object.keys(baitCounts),
          datasets: [
            {
              data: Object.values(baitCounts),
              backgroundColor: [
                "rgba(255,99,132,0.6)",
                "rgba(54,162,235,0.6)",
                "rgba(255,206,86,0.6)",
                "rgba(75,192,192,0.6)",
                "rgba(153,102,255,0.6)",
              ],
            },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Catches by Bait",
              font: {
                size: 16,
                weight: "none",
              },
              color: "#000000",
              padding: {
                top: 10,
                bottom: 20
              }
            },
            legend: {
              display: true,
              position: "bottom",
              labels: {
                font: {
                  size: 16,
                },
                color: '#000000'
              }
            },
          }
        },
      });
      break;
    }


    /* -------------------- Average Length Chart -------------------- */
    case "averageLengthChart": {
      const lengthSums = {};
      const lengthCounts = {};


      data.forEach((c) => {
        if (!c.species || !c.length_in) return;
        lengthSums[c.species] = (lengthSums[c.species] || 0) + parseFloat(c.length_in);
        lengthCounts[c.species] = (lengthCounts[c.species] || 0) + 1;
      });


      const species = Object.keys(lengthSums);
      const averageLengths = species.map((s) => lengthSums[s] / lengthCounts[s]);


      chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
          labels: species,
          datasets: [
            { label: "Average Length (in)", data: averageLengths, backgroundColor: "rgba(153,102,255,0.6)" },
          ],
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              labels: {
                font: {
                  size: 16,
                },
                color: '#000000'
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Species", font: { size: 16 }, color: '#000000'},
              beginAtZero: true,
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: {
                color: '#777777'
              }
            },
            y: {
              title: { display: true, text: "Length (in)", font: { size: 16 }, color: '#000000'},
              ticks: {
                font: { size: 16 },
                color: '#000000'
              },
              grid: {
                color: '#777777'
              }
            }
          }
        },
      });
      break;
    }
  }
}


/* -------------------- DOM Initialization & Event Binding -------------------- */


document.addEventListener("DOMContentLoaded", () => {
  const chartSelect = document.getElementById("chartSelect");
  const chartButtons = Array.from(document.querySelectorAll(".chart-buttons button"));


  if (!chartSelect) return;


  chartSelect.addEventListener("change", (e) => {
  const selectedChart = e.target.value;
  chartButtons.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.chart === selectedChart)
  );
  renderChart(selectedChart);
});


  chartButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      chartSelect.value = btn.dataset.chart;
      chartSelect.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });


  const initialChart = chartSelect.value;
  chartButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.chart === initialChart));


  renderChart(initialChart || "speciesCountChart");
});


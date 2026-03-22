const user_id = parseInt(localStorage.getItem("user_id"));
if (!user_id) {
    alert("Please login first");
    window.location.href = "login.html";
}

const BASE_URL = "http://127.0.0.1:5000";

// =========================
// LOAD PROFILE
// =========================
function loadProfile() {
    fetch(`${BASE_URL}/profile/${user_id}`)
    .then(res => res.json())
    .then(data => {
        const email = data.email || "";
        const name = email.split("@")[0] || "User";

        document.getElementById("profileEmail").innerText = email;
        document.getElementById("profileName").innerText = name;
        document.getElementById("avatarCircle").innerText = name.charAt(0).toUpperCase();
    })
    .catch(err => console.error("PROFILE ERROR:", err));
}

// =========================
// LOAD STATS + CHART
// =========================
function loadStats() {
    fetch(`${BASE_URL}/stats/${user_id}`)
    .then(res => res.json())
    .then(data => {
        document.getElementById("completedCount").innerText = data.completed;
        document.getElementById("pendingCount").innerText = data.pending;
        renderChart(data.daily);
    })
    .catch(err => console.error("STATS ERROR:", err));
}

// =========================
// RENDER BAR CHART
// =========================
function renderChart(daily) {
    const isDark = document.body.classList.contains("dark");
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // daily is an array of 7 numbers, one per day of the current week
    const ctx = document.getElementById("taskChart").getContext("2d");

    new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: daily,
                backgroundColor: "rgba(191, 234, 59, 0.7)",
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDark ? "#aaa" : "#666",
                        font: { family: "K2D", size: 12 }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 2,
                        color: isDark ? "#aaa" : "#666",
                        font: { family: "K2D", size: 12 }
                    },
                    grid: {
                        color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"
                    }
                }
            }
        }
    });
}

// =========================
// LOGOUT
// =========================
document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("notebook_id");
    localStorage.removeItem("notebook_name");
    window.location.href = "login.html";
};

// =========================
// THEME TOGGLE
// =========================
const themeBtn = document.getElementById("themeToggle");
themeBtn.onclick = () => {
    document.body.classList.toggle("dark");
    themeBtn.innerText = document.body.classList.contains("dark") ? "☀️" : "🌙";
};

// =========================
// SIDE MENU
// =========================
const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");

menuBtn.onclick = (e) => {
    e.stopPropagation();
    sideMenu.classList.toggle("hidden");
};

document.addEventListener("click", (e) => {
    if (!sideMenu.classList.contains("hidden") && !sideMenu.contains(e.target)) {
        sideMenu.classList.add("hidden");
    }
});

// =========================
// INIT
// =========================
loadProfile();
loadStats();

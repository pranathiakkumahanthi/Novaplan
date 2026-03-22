const user_id = parseInt(localStorage.getItem("user_id"));
if (!user_id) {
    alert("Please login first");
    window.location.href = "login.html";
}

const BASE_URL = "http://127.0.0.1:5000";

let today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
let allTasks = [];
let categories = [];
let selectedDate = null;

const monthNames = ["January","February","March","April","May","June",
                    "July","August","September","October","November","December"];
function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
// =========================
// LOAD TASKS & CATEGORIES
// =========================
function loadAll() {
    Promise.all([
        fetch(`${BASE_URL}/tasks/${user_id}`).then(r => r.json()),
        fetch(`${BASE_URL}/categories/${user_id}`).then(r => r.json())
    ]).then(([tasks, cats]) => {
        allTasks = tasks;
        categories = cats;
        populateCategorySelect();
        renderCalendar();
    });
}

function populateCategorySelect() {
    const sel = document.getElementById("categorySelect");
    sel.innerHTML = `<option value="">Choose Category</option>`;
    categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.innerText = cat;
        sel.appendChild(opt);
    });
}

// =========================
// RENDER CALENDAR
// =========================
function renderCalendar() {
    document.getElementById("monthLabel").innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = "";

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const todayStr = toDateStr(today);

    // tasks grouped by date
    const tasksByDate = {};
    allTasks.forEach(t => {
        if (t.due_date) {
            if (!tasksByDate[t.due_date]) tasksByDate[t.due_date] = [];
            tasksByDate[t.due_date].push(t);
        }
    });

    // empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement("div");
        empty.className = "cal-day empty";
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement("div");
        cell.className = "cal-day";

        if (dateStr === todayStr) cell.classList.add("today");
        if (dateStr === selectedDate) cell.classList.add("selected");

        const isPast = dateStr < todayStr;
        if (isPast && dateStr !== todayStr) cell.classList.add("past");

        cell.innerHTML = `<span>${d}</span>`;

        // show dot if tasks exist on this date
        if (tasksByDate[dateStr] && tasksByDate[dateStr].length > 0) {
            const dot = document.createElement("div");
            dot.className = "task-dot";
            cell.appendChild(dot);
        }

        cell.onclick = () => onDateClick(dateStr, tasksByDate[dateStr] || []);
        grid.appendChild(cell);
    }
}

// =========================
// DATE CLICK
// =========================
function onDateClick(dateStr, tasks) {
    selectedDate = dateStr;
    renderCalendar();

    const panel = document.getElementById("taskPanel");
    const overlay = document.getElementById("overlay");
    const label = document.getElementById("selectedDateLabel");
    const list = document.getElementById("panelTaskList");

    // format label nicely
    const d = new Date(dateStr + "T00:00:00");
    label.innerText = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    list.innerHTML = "";

    if (tasks.length === 0) {
        list.innerHTML = `<div class="panel-empty">No tasks for this day.</div>`;
    } else {
        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "panel-task";
            item.innerHTML = `
                <div class="circle"></div>
                <div class="panel-task-info">
                    <p>${task.title}</p>
                    <small>${task.category}</small>
                </div>
            `;
            item.querySelector(".circle").onclick = () => {
                fetch(`${BASE_URL}/complete_task`, {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ task_id: task.task_id })
                }).then(() => {
                    item.remove();
                    // remove from allTasks
                    allTasks = allTasks.filter(t => t.task_id !== task.task_id);
                    renderCalendar();
                });
            };
            list.appendChild(item);
        });
    }

    // add task button — always visible
    const addBtn = document.createElement("button");
    addBtn.className = "panel-add-btn";
    addBtn.innerText = "+ Add Task";
    addBtn.onclick = () => openTaskSheet(dateStr);
    list.appendChild(addBtn);

    panel.classList.remove("hidden");
    overlay.classList.remove("hidden");
}

// =========================
// CLOSE PANEL
// =========================
document.getElementById("closePanelBtn").onclick = closePanel;
document.getElementById("overlay").onclick = () => {
    const sheet = document.getElementById("taskSheet");
    if (!sheet.classList.contains("hidden")) {
        sheet.classList.add("hidden");
    } else {
        closePanel();
    }
};

function closePanel() {
    document.getElementById("taskPanel").classList.add("hidden");
    document.getElementById("overlay").classList.add("hidden");
    document.getElementById("taskSheet").classList.add("hidden");
    selectedDate = null;
    renderCalendar();
}

// =========================
// OPEN TASK SHEET
// =========================
function openTaskSheet(dateStr) {
    const sheet = document.getElementById("taskSheet");
    document.getElementById("taskDate").value = dateStr;
    document.getElementById("taskInput").value = "";
    sheet.classList.remove("hidden");
}

// =========================
// ADD TASK
// =========================
const sendBtn = document.getElementById("sendTask");
const taskInput = document.getElementById("taskInput");

sendBtn.onclick = addTask;
taskInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addTask();
});

function addTask() {
    const title = taskInput.value.trim();
    const date = document.getElementById("taskDate").value;
    const category = document.getElementById("categorySelect").value || "No Category";

    if (!title) return;

    fetch(`${BASE_URL}/add_task`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title, due_date: date, category, user_id })
    })
    .then(res => res.json())
    .then(() => {
        taskInput.value = "";
        document.getElementById("taskSheet").classList.add("hidden");

        // reload tasks then reopen panel for the same date
        fetch(`${BASE_URL}/tasks/${user_id}`)
        .then(r => r.json())
        .then(tasks => {
            allTasks = tasks;
            renderCalendar();
            const dayTasks = tasks.filter(t => t.due_date === date);
            onDateClick(date, dayTasks);
        });
    })
    .catch(err => console.error("ADD TASK ERROR:", err));
}

// =========================
// MONTH NAVIGATION
// =========================
document.getElementById("prevMonth").onclick = () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
};

document.getElementById("nextMonth").onclick = () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
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
loadAll();

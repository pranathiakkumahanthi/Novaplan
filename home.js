const user_id = parseInt(localStorage.getItem("user_id"));
if (!user_id) {
    alert("Please login first");
    window.location.href = "login.html";
}

const addBtn = document.getElementById("addTaskBtn");
const container = document.getElementById("taskContainer");
const categoryBar = document.getElementById("categoryBar");
const sheet = document.getElementById("taskSheet");
const overlay = document.getElementById("overlay");
const input = document.getElementById("taskInput");
const sendBtn = document.getElementById("sendTask");

let categories = [];
let currentFilter = "All";

// =========================
// LOAD CATEGORIES FROM DB
// =========================
function loadCategories() {
    fetch(`http://127.0.0.1:5000/categories/${user_id}`)
    .then(res => res.json())
    .then(data => {
        categories = data;
        renderCategories();
        populateCategorySelect(); // FIX: populate dropdown after loading
    });
}

// =========================
// POPULATE CATEGORY SELECT
// FIX: was never populated from DB
// =========================
function populateCategorySelect() {
    const categorySelect = document.getElementById("categorySelect");
    categorySelect.innerHTML = `<option value="">Choose Category</option>`;
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.innerText = cat;
        categorySelect.appendChild(option);
    });
}

// =========================
// RENDER CATEGORIES
// =========================
function renderCategories() {
    categoryBar.innerHTML = `
        <button id="allBtn" class="active">All</button>
        <button id="addCategory">+</button>
    `;

    document.getElementById("allBtn").onclick = () => {
        setActiveCategory("All");
        currentFilter = "All";
        renderTasks();
    };

    categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.innerText = cat;
        btn.dataset.cat = cat;

        btn.onclick = () => {
            setActiveCategory(cat);
            currentFilter = cat;
            renderTasks();
        };

        categoryBar.insertBefore(btn, document.getElementById("addCategory"));
    });

    // FIX: use modal instead of prompt()
    document.getElementById("addCategory").onclick = () => {
        document.getElementById("addCategoryModal").classList.remove("hidden");
    };
}

// =========================
// SET ACTIVE CATEGORY BUTTON
// FIX: active class was never updated on click
// =========================
function setActiveCategory(selected) {
    const buttons = categoryBar.querySelectorAll("button");
    buttons.forEach(btn => {
        btn.classList.remove("active");
        if (btn.id === "allBtn" && selected === "All") btn.classList.add("active");
        if (btn.dataset.cat === selected) btn.classList.add("active");
    });
}

// =========================
// ADD CATEGORY MODAL CONFIRM
// FIX: replaced prompt() with existing modal
// =========================
document.getElementById("confirmAddCategory").onclick = () => {
    const name = document.getElementById("newCategoryInput").value.trim();
    if (!name) return;

    fetch("http://127.0.0.1:5000/add_category", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ name: name, user_id: user_id })
    })
    .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
    })
    .then(() => {
        document.getElementById("newCategoryInput").value = "";
        document.getElementById("addCategoryModal").classList.add("hidden");
        loadCategories();
    })
    .catch(err => console.error("ADD CATEGORY ERROR:", err));
};

// =========================
// ADD TASK
// =========================
sendBtn.onclick = () => {
    const title = input.value.trim();
    const date = document.getElementById("taskDate").value;
    const categorySelect = document.getElementById("categorySelect");

    if (!title) return;

    let selectedCategory;
    if (currentFilter === "All") {
        selectedCategory = categorySelect.value || "No Category";
    } else {
        selectedCategory = currentFilter;
    }

    fetch("http://127.0.0.1:5000/add_task", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            title: title,
            due_date: date,
            category: selectedCategory,
            user_id: user_id
        })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to add task");
        return res.json();
    })
    .then(() => {
        renderTasks();
        input.value = "";
        document.getElementById("taskDate").value = "";
        categorySelect.value = "";
    })
    .catch(err => console.error("ADD TASK ERROR:", err));
};

input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendBtn.click();
});

// =========================
// RENDER TASKS
// FIX: only shows pending tasks (status != done)
// =========================
function renderTasks() {
    fetch(`http://127.0.0.1:5000/tasks/${user_id}`)
    .then(res => res.json())
    .then(data => {
        container.innerHTML = "";

        let filtered = data;
        if (currentFilter !== "All") {
            filtered = data.filter(t => t.category === currentFilter);
        }

        filtered.forEach(task => {
            const div = document.createElement("div");
            div.className = "task";

            let formattedDate = "";
            if (task.due_date) {
                const d = new Date(task.due_date);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                formattedDate = `${day}-${month}`;
            }

            div.innerHTML = `
                <div class="task-left">
                    <div class="circle"></div>
                    <div>
                        <p>${task.title}</p>
                        <small>
                            <span class="due-date">${formattedDate}</span>${formattedDate ? ' • ' : ''}${task.category}
                        </small>
                    </div>
                </div>
            `;

            // FIX: mark as done in DB, then remove from screen
            div.querySelector(".circle").onclick = () => {
                fetch("http://127.0.0.1:5000/complete_task", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({ task_id: task.task_id })
                })
                .then(res => {
                    if (!res.ok) throw new Error("Failed to complete task");
                    div.remove(); // remove from screen instantly
                })
                .catch(err => console.error("COMPLETE TASK ERROR:", err));
            };

            container.appendChild(div);
        });
    });
}

// =========================
// OPEN / CLOSE TASK SHEET
// =========================
addBtn.onclick = () => {
    sheet.classList.remove("hidden");
    overlay.classList.remove("hidden");

    // Show category select only when in "All" view
    const categorySelect = document.getElementById("categorySelect");
    categorySelect.style.display = currentFilter === "All" ? "block" : "none";
};

overlay.onclick = () => {
    sheet.classList.add("hidden");
    overlay.classList.add("hidden");
};

// =========================
// THEME TOGGLE
// FIX: both branches had "🌙" — sun icon was never shown
// =========================
const themeBtn = document.getElementById("themeToggle");
themeBtn.onclick = () => {
    document.body.classList.toggle("dark");
    themeBtn.innerText = document.body.classList.contains("dark") ? "☀️" : "🌙";
};

// =========================
// MENU TOGGLE
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
// DELETE CATEGORY MODAL
// =========================
document.getElementById("deleteCat").onclick = () => {
    const list = document.getElementById("deleteList");
    list.innerHTML = "";
    categories.forEach(cat => {
        const item = document.createElement("div");
        item.className = "delete-item";
        item.innerHTML = `
            <input type="checkbox" value="${cat}">
            <span>${cat}</span>
        `;
        list.appendChild(item);
    });
    document.getElementById("deleteModal").classList.remove("hidden");
    document.getElementById("categoryMenu").classList.add("hidden");
};

document.getElementById("confirmDelete").onclick = () => {
    const checked = document.querySelectorAll("#deleteList input:checked");
    const promises = Array.from(checked).map(cb =>
        fetch("http://127.0.0.1:5000/delete_category", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ user_id: user_id, name: cb.value })
        })
    );
    Promise.all(promises).then(() => {
        document.getElementById("deleteModal").classList.add("hidden");
        loadCategories();
        renderTasks();
    });
};

// =========================
// RENAME CATEGORY MODAL
// =========================
document.getElementById("editCat").onclick = () => {
    document.getElementById("renameModal").classList.remove("hidden");
    document.getElementById("categoryMenu").classList.add("hidden");
};

document.getElementById("confirmRename").onclick = () => {
    const oldName = document.getElementById("oldCategory").value.trim();
    const newName = document.getElementById("newCategory").value.trim();
    if (!oldName || !newName) return;

    fetch("http://127.0.0.1:5000/rename_category", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ user_id: user_id, old_name: oldName, new_name: newName })
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("renameModal").classList.add("hidden");
        document.getElementById("oldCategory").value = "";
        document.getElementById("newCategory").value = "";
        loadCategories();
        renderTasks();
    })
    .catch(err => console.error("RENAME ERROR:", err));
};

// =========================
// CLOSE MODALS ON OVERLAY CLICK
// =========================
document.querySelectorAll(".modal").forEach(modal => {
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.add("hidden");
    };
});
// THREE DOTS MENU
document.getElementById("menuDots").onclick = (e) => {
    e.stopPropagation();
    const menu = document.getElementById("categoryMenu");
    menu.classList.toggle("hidden");
};

// close menu when clicking anywhere else
document.addEventListener("click", (e) => {
    const menu = document.getElementById("categoryMenu");
    if (!menu.classList.contains("hidden") && !menu.contains(e.target)) {
        menu.classList.add("hidden");
    }
});
// =========================
// INIT
// =========================
loadCategories();
renderTasks();
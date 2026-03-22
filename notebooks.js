const user_id = parseInt(localStorage.getItem("user_id"));
if (!user_id) {
    alert("Please login first");
    window.location.href = "login.html";
}

const BASE_URL = "http://127.0.0.1:5000";
const grid = document.getElementById("notebookGrid");
const modal = document.getElementById("addNotebookModal");

let selectedCover = "notebook_green.png";

// =========================
// LOAD NOTEBOOKS
// =========================
function loadNotebooks() {
    fetch(`${BASE_URL}/notebooks/${user_id}`)
    .then(res => res.json())
    .then(data => {
        grid.innerHTML = "";

        data.forEach(nb => {
            const card = document.createElement("div");
            card.className = "notebook-card";
            card.innerHTML = `
                <div class="notebook-img-wrap">
                    <img src="${nb.cover || 'notebook_green.png'}" alt="${nb.name}">
                    <span class="nb-delete" data-id="${nb.notebook_id}">✕</span>
                </div>
                <span>${nb.name}</span>
            `;

            card.onclick = () => {
                localStorage.setItem("notebook_id", nb.notebook_id);
                localStorage.setItem("notebook_name", nb.name);
                window.location.href = "notes.html";
            };

        
            card.querySelector(".nb-delete").onclick = (e) => {
                e.stopPropagation();
                deletingNotebookId = nb.notebook_id;
                document.getElementById("deleteNotebookMsg").innerText = `"${nb.name}" and all its notes will be deleted.`;
                document.getElementById("deleteNotebookModal").classList.remove("hidden");
            };

            grid.appendChild(card);  // ✅ appendChild also inside forEach
        });

        // ADD BUTTON always at the end
        const addBtn = document.createElement("div");
        addBtn.className = "add-notebook-btn";
        addBtn.innerHTML = `
            <div class="add-circle">+</div>
            <span>Add notebooks</span>
        `;
        addBtn.onclick = () => modal.classList.remove("hidden");
        grid.appendChild(addBtn);
    });
}

// =========================
// DELETE NOTEBOOK MODAL
// =========================
document.getElementById("confirmDeleteNotebook").onclick = () => {
    if (!deletingNotebookId) return;
 
    fetch(`${BASE_URL}/delete_notebook`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ notebook_id: deletingNotebookId })
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("deleteNotebookModal").classList.add("hidden");
        deletingNotebookId = null;
        loadNotebooks();
    })
    .catch(err => console.error("DELETE NOTEBOOK ERROR:", err));
};
 
document.getElementById("cancelDeleteNotebook").onclick = () => {
    document.getElementById("deleteNotebookModal").classList.add("hidden");
    deletingNotebookId = null;
};
 
document.getElementById("deleteNotebookModal").onclick = (e) => {
    if (e.target === document.getElementById("deleteNotebookModal")) {
        document.getElementById("deleteNotebookModal").classList.add("hidden");
        deletingNotebookId = null;
    }
};

// =========================
// COVER SELECTION
// =========================
document.querySelectorAll(".cover-opt").forEach(opt => {
    opt.onclick = () => {
        document.querySelectorAll(".cover-opt").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        selectedCover = opt.dataset.src;
        document.getElementById("previewImg").src = selectedCover;
    };
});

// =========================
// CREATE NOTEBOOK
// =========================
document.getElementById("confirmAddNotebook").onclick = () => {
    const name = document.getElementById("notebookNameInput").value.trim();
    if (!name) return;

    fetch(`${BASE_URL}/add_notebook`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ user_id, name, cover: selectedCover })
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById("notebookNameInput").value = "";
        modal.classList.add("hidden");
        loadNotebooks();
    })
    .catch(err => console.error("ADD NOTEBOOK ERROR:", err));
};

// close modal on outside click
modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
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
loadNotebooks();

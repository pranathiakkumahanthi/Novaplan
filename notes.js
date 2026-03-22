const user_id = parseInt(localStorage.getItem("user_id"));
const notebook_id = parseInt(localStorage.getItem("notebook_id"));
const notebook_name = localStorage.getItem("notebook_name") || "Notebook";

if (!user_id) {
    alert("Please login first");
    window.location.href = "login.html";
}
if (!notebook_id) {
    window.location.href = "notebooks.html";
}

const BASE_URL = "http://127.0.0.1:5000";
const grid = document.getElementById("notesGrid");
const noteModal = document.getElementById("noteModal");
const deleteModal = document.getElementById("deleteNoteModal");

document.getElementById("notebookTitle").innerText = notebook_name;

let editingNoteId = null;
let deletingNoteId = null;

// =========================
// LOAD NOTES
// =========================
function loadNotes() {
    fetch(`${BASE_URL}/notes/${notebook_id}`)
    .then(res => res.json())
    .then(data => {
        grid.innerHTML = "";

        if (data.length === 0) {
            grid.innerHTML = `<div class="empty-state">No notes yet. Tap + to add one!</div>`;
            return;
        }

        data.forEach(note => {
            const card = document.createElement("div");
            card.className = "note-card";
            card.innerHTML = `
                <span class="note-delete" data-id="${note.note_id}">✕</span>
                <h4>${note.title || 'Untitled'}</h4>
                <p>${note.content || ''}</p>
            `;

            // open note for editing
            card.onclick = (e) => {
                if (e.target.classList.contains("note-delete")) return;
                openNoteModal(note);
            };

            // delete
            card.querySelector(".note-delete").onclick = (e) => {
                e.stopPropagation();
                deletingNoteId = note.note_id;
                deleteModal.classList.remove("hidden");
            };

            grid.appendChild(card);
        });
    });
}

// =========================
// OPEN NOTE MODAL
// =========================
function openNoteModal(note = null) {
    editingNoteId = note ? note.note_id : null;
    document.getElementById("noteTitleInput").value = note ? (note.title || "") : "";
    document.getElementById("noteContentInput").value = note ? (note.content || "") : "";
    noteModal.classList.remove("hidden");
}

// =========================
// SAVE NOTE (add or edit)
// =========================
document.getElementById("saveNote").onclick = () => {
    const title = document.getElementById("noteTitleInput").value.trim();
    const content = document.getElementById("noteContentInput").value.trim();

    if (!title && !content) return;

    if (editingNoteId) {
        // UPDATE
        fetch(`${BASE_URL}/update_note`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ note_id: editingNoteId, title, content })
        })
        .then(res => res.json())
        .then(() => {
            noteModal.classList.add("hidden");
            loadNotes();
        })
        .catch(err => console.error("UPDATE NOTE ERROR:", err));
    } else {
        // ADD NEW
        fetch(`${BASE_URL}/add_note`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ user_id, notebook_id, title, content })
        })
        .then(res => res.json())
        .then(() => {
            noteModal.classList.add("hidden");
            loadNotes();
        })
        .catch(err => console.error("ADD NOTE ERROR:", err));
    }
};

// =========================
// DELETE NOTE
// =========================
document.getElementById("confirmDelete").onclick = () => {
    if (!deletingNoteId) return;

    fetch(`${BASE_URL}/delete_note`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ note_id: deletingNoteId })
    })
    .then(res => res.json())
    .then(() => {
        deleteModal.classList.add("hidden");
        deletingNoteId = null;
        loadNotes();
    })
    .catch(err => console.error("DELETE NOTE ERROR:", err));
};

// =========================
// CANCEL / CLOSE MODALS
// =========================
document.getElementById("cancelNote").onclick = () => noteModal.classList.add("hidden");
document.getElementById("cancelDelete").onclick = () => deleteModal.classList.add("hidden");

noteModal.onclick = (e) => { if (e.target === noteModal) noteModal.classList.add("hidden"); };
deleteModal.onclick = (e) => { if (e.target === deleteModal) deleteModal.classList.add("hidden"); };

// =========================
// FLOATING ADD BUTTON
// =========================
document.getElementById("addNoteBtn").onclick = () => openNoteModal();

// =========================
// BACK BUTTON
// =========================
document.getElementById("backBtn").onclick = () => {
    window.location.href = "notebooks.html";
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
loadNotes();

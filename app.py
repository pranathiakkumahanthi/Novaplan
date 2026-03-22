from flask import Flask, request, jsonify
from flask_cors import CORS
import oracledb
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import os

app = Flask(__name__)
CORS(app)

print("APP STARTED")

# =========================
# DB CONNECTION
# =========================
connection = oracledb.connect(
    user="system",
    password="system",
    dsn="localhost/XE"
)

# =========================
# HOME
# =========================
@app.route("/")
def home():
    return "NovaPlan Backend Running 🔥"

# =========================
# SIGNUP
# =========================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    with connection.cursor() as cursor:  # FIX: use context manager so cursor closes
        cursor.execute("SELECT * FROM users WHERE email=:1", [email])
        if cursor.fetchone():
            return jsonify({"status": "fail", "message": "Email exists"})

        cursor.execute("""
            INSERT INTO users (user_id, email, password)
            VALUES (user_seq.NEXTVAL, :1, :2)
        """, [email, password])

    connection.commit()
    return jsonify({"status": "success"})

# =========================
# LOGIN
# =========================
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT user_id FROM users 
            WHERE email=:1 AND password=:2
        """, [email, password])

        row = cursor.fetchone()

    if row:
        return jsonify({"status": "success", "user_id": row[0]})
    else:
        return jsonify({"status": "fail"})

# =========================
# GOOGLE LOGIN
# =========================
@app.route("/google-login", methods=["POST"])
def google_login():
    data = request.json
    token = data.get("token")

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            grequests.Request(),
            os.environ.get("383311099064-d7hhsdpsi8kc9695s7r6ik87so7ok3k8.apps.googleusercontent.com")  # FIX: moved to env variable
        )

        email = idinfo["email"]

        with connection.cursor() as cursor:
            cursor.execute("SELECT user_id FROM users WHERE email=:1", [email])
            row = cursor.fetchone()

            if row:
                user_id = row[0]
            else:
                cursor.execute("""
                    INSERT INTO users (user_id, email, password)
                    VALUES (user_seq.NEXTVAL, :1, 'google')
                """, [email])
                connection.commit()

                cursor.execute("SELECT user_id FROM users WHERE email=:1", [email])
                user_id = cursor.fetchone()[0]

        return {"status": "success", "user_id": user_id}

    except Exception as e:
        print("GOOGLE LOGIN ERROR:", e)
        return {"status": "fail"}

# =========================
# GET TASKS
# FIX: only returns pending tasks so completed ones don't show
# =========================
@app.route("/tasks/<int:user_id>")
def get_tasks(user_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT task_id, title, due_date, category
            FROM tasks
            WHERE user_id = :1 AND status = 'pending'
        """, [user_id])

        data = []
        for row in cursor:
            data.append({
                "task_id": row[0],
                "title": row[1],
                "due_date": str(row[2])[:10] if row[2] else "",
                "category": row[3] if row[3] else "No Category"
            })

    return jsonify(data)

# =========================
# ADD TASK
# =========================
@app.route("/add_task", methods=["POST"])
def add_task():
    data = request.json
    due_date = data.get("due_date") or None
    user_id = int(data["user_id"])

    # Convert date string to a Python date object so Oracle accepts it
    from datetime import datetime
    parsed_date = None
    if due_date:
        try:
            parsed_date = datetime.strptime(due_date, "%Y-%m-%d").date()
        except ValueError:
            parsed_date = None

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO tasks (task_id, user_id, title, due_date, status, category)
            VALUES (task_seq.NEXTVAL, :1, :2, :3, 'pending', :4)
        """, [
            user_id,
            data["title"],
            parsed_date,
            data.get("category", "No Category")
        ])

    connection.commit()
    return {"status": "ok"}
# =========================
# COMPLETE TASK (NEW)
# FIX: marks as done in DB instead of deleting
# =========================
@app.route("/complete_task", methods=["POST"])
def complete_task():
    data = request.json

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE tasks SET status = 'done'
            WHERE task_id = :1
        """, [data["task_id"]])

    connection.commit()
    return {"status": "done"}

# =========================
# DELETE TASK
# =========================
@app.route("/delete_task", methods=["POST"])
def delete_task():
    data = request.json

    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM tasks WHERE task_id=:1", [data["task_id"]])

    connection.commit()
    return {"status": "deleted"}

# =========================
# GET CATEGORIES
# =========================
@app.route("/categories/<int:user_id>")
def get_categories(user_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT name FROM categories WHERE user_id = :1
        """, [user_id])
        result = [row[0] for row in cursor]

    return jsonify(result)

# =========================
# ADD CATEGORY
# =========================
@app.route("/add_category", methods=["POST"])
def add_category():
    data = request.json

    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO categories (category_id, user_id, name)
            VALUES (category_seq.NEXTVAL, :1, :2)
        """, [int(data["user_id"]), data["name"]])

    connection.commit()
    return {"status": "ok"}

# =========================
# DELETE CATEGORY
# =========================
@app.route("/delete_category", methods=["POST"])
def delete_category():
    data = request.json

    with connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM categories 
            WHERE user_id=:1 AND name=:2
        """, [int(data["user_id"]), data["name"]])

    connection.commit()
    return {"status": "deleted"}

# =========================
# RENAME CATEGORY (NEW)
# FIX: was referenced in JS but route didn't exist
# =========================
@app.route("/rename_category", methods=["POST"])
def rename_category():
    data = request.json

    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE categories SET name = :1
            WHERE user_id = :2 AND name = :3
        """, [data["new_name"], int(data["user_id"]), data["old_name"]])

        # also update tasks that used the old category name
        cursor.execute("""
            UPDATE tasks SET category = :1
            WHERE user_id = :2 AND category = :3
        """, [data["new_name"], int(data["user_id"]), data["old_name"]])

    connection.commit()
    return {"status": "ok"}
# GET NOTEBOOKS
@app.route("/notebooks/<int:user_id>")
def get_notebooks(user_id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT notebook_id, name, cover FROM notebooks WHERE user_id = :1", [user_id])
        data = [{"notebook_id": r[0], "name": r[1], "cover": r[2]} for r in cursor]
    return jsonify(data)

# ADD NOTEBOOK
@app.route("/add_notebook", methods=["POST"])
def add_notebook():
    data = request.json
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO notebooks (notebook_id, user_id, name, cover)
            VALUES (notebook_seq.NEXTVAL, :1, :2, :3)
        """, [int(data["user_id"]), data["name"], data.get("cover", "notebook_green.png")])
    connection.commit()
    return {"status": "ok"}

# GET NOTES
@app.route("/notes/<int:notebook_id>")
def get_notes(notebook_id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT note_id, title, content FROM notes WHERE notebook_id = :1", [notebook_id])
        data = [{"note_id": r[0], "title": r[1], "content": r[2].read() if r[2] else ""} for r in cursor]
    return jsonify(data)

# ADD NOTE
@app.route("/add_note", methods=["POST"])
def add_note():
    data = request.json
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO notes (note_id, user_id, notebook_id, title, content)
            VALUES (note_seq.NEXTVAL, :1, :2, :3, :4)
        """, [int(data["user_id"]), int(data["notebook_id"]), data.get("title",""), data.get("content","")])
    connection.commit()
    return {"status": "ok"}

# UPDATE NOTE
@app.route("/update_note", methods=["POST"])
def update_note():
    data = request.json
    with connection.cursor() as cursor:
        cursor.execute("UPDATE notes SET title=:1, content=:2 WHERE note_id=:3",
            [data.get("title",""), data.get("content",""), int(data["note_id"])])
    connection.commit()
    return {"status": "ok"}

# DELETE NOTE
@app.route("/delete_note", methods=["POST"])
def delete_note():
    data = request.json
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM notes WHERE note_id=:1", [int(data["note_id"])])
    connection.commit()
    return {"status": "deleted"}
# DELETE NOTEBOOK
@app.route("/delete_notebook", methods=["POST"])
def delete_notebook():
    data = request.json
    with connection.cursor() as cursor:
        # delete all notes in the notebook first
        cursor.execute("DELETE FROM notes WHERE notebook_id = :1", [int(data["notebook_id"])])
        cursor.execute("DELETE FROM notebooks WHERE notebook_id = :1", [int(data["notebook_id"])])
    connection.commit()
    return {"status": "deleted"}
 # GET PROFILE
@app.route("/profile/<int:user_id>")
def get_profile(user_id):
    with connection.cursor() as cursor:
        cursor.execute("SELECT email FROM users WHERE user_id = :1", [user_id])
        row = cursor.fetchone()
    return jsonify({"email": row[0] if row else ""})

# GET STATS
@app.route("/stats/<int:user_id>")
def get_stats(user_id):
    with connection.cursor() as cursor:
        # completed count
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE user_id = :1 AND status = 'done'", [user_id])
        completed = cursor.fetchone()[0]

        # pending count
        cursor.execute("SELECT COUNT(*) FROM tasks WHERE user_id = :1 AND status = 'pending'", [user_id])
        pending = cursor.fetchone()[0]

        # tasks completed per day this week (Sun to Sat)
        cursor.execute("""
            SELECT TO_CHAR(due_date, 'D'), COUNT(*)
            FROM tasks
            WHERE user_id = :1
              AND status = 'done'
              AND due_date >= TRUNC(SYSDATE, 'IW') - 1
              AND due_date < TRUNC(SYSDATE, 'IW') + 6
            GROUP BY TO_CHAR(due_date, 'D')
        """, [user_id])
        
        daily = [0] * 7
        for row in cursor:
            day_index = int(row[0]) - 1  # Oracle D: 1=Sunday
            daily[day_index] = int(row[1])

    return jsonify({"completed": completed, "pending": pending, "daily": daily})
# =========================
# RUN SERVER
# FIX: debug flag from env variable
# =========================
if __name__ == "__main__":
    print("SERVER STARTED...")
    app.run(debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
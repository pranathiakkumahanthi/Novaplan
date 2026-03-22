// server.js
const express = require("express");
const oracledb = require("oracledb");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express(); // ✅ FIRST create app

app.use(cors());       // ✅ THEN use middleware
app.use(express.json());
// app.use(bodyParser.json()); ← optional, you can remove

const dbConfig = {
    user: "system",
    password: "system",
    connectString: "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=localhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=XE)))"
};

// SIGNUP API
app.post("/signup", async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await oracledb.getConnection(dbConfig);

        await connection.execute(
            `INSERT INTO users (user_id, email, password)
             VALUES (user_seq.NEXTVAL, :email, :password)`,
            [email, password],
            { autoCommit: true }
        );

        res.send("User registered");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error");
    }
});

// LOGIN API
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await oracledb.getConnection(dbConfig);

        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email AND password = :password`,
            [email, password]
        );

        if (result.rows.length > 0) {
            res.send("Login successful");
        } else {
            res.status(401).send("Invalid credentials");
        }
    } catch (err) {
        res.status(500).send("Error");
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client("383311099064-d7hhsdpsi8kc9695s7r6ik87so7ok3k8.apps.googleusercontent.com");

app.post("/google-login", async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });

        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        console.log("Google User:", email, name);

        const connection = await oracledb.getConnection(dbConfig);

        console.log("Checking user in DB...");

        const result = await connection.execute(
            `SELECT * FROM users WHERE email = :email`,
            { email }
        );

        console.log("Rows found:", result.rows.length);

        if (result.rows.length === 0) {
            console.log("Inserting new user...");

            await connection.execute(
                `INSERT INTO users (user_id, email, password)
                 VALUES (user_seq.NEXTVAL, :email, :password)`,
                {
                    email: email,
                    password: "google_auth"
                },
                { autoCommit: true }
            );

            console.log("User inserted!");
        } else {
            console.log("User already exists");
        }

        await connection.close();

        res.send("Google login success");

    } catch (err) {
        console.error("ERROR:", err);
        res.status(401).send("Invalid token");
    }
});
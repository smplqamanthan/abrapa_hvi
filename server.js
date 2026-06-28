const express = require("express");
const cors = require("cors");
const path = require("path");

const apiRoutes = require("./routes/api");
const uploadRoutes = require("./routes/upload");
const downloadRoutes = require("./routes/download");
const configRoutes = require("./routes/config");

const app = express();

const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost",
            "http://127.0.0.1",
            "null"
        ];

        if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            callback(null, true);
            return;
        }

        callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public"), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith(".html") || filePath.endsWith(".json")) {
            res.setHeader("Cache-Control", "no-store");
        }
    }
}));

app.use("/api", apiRoutes);
app.use("/upload", uploadRoutes);
app.use("/download", downloadRoutes);
app.use("/api/config", configRoutes);

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
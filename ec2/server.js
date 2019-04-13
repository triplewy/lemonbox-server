#!/usr/bin/env node
require("dotenv").config();
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const colors = require("colors");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const mysqlRoutes = require("./routes/mysql");
const dynamoRoutes = require("./routes/dynamo");
const gitRoutes = require("./routes/git");

app.get("/", (req, res) => {
  res.send({ message: "New hello world message!" });
});

app.use("/mysql", mysqlRoutes(express));
app.use("/dynamo", dynamoRoutes(express));
app.use("/code", gitRoutes(express));

server.listen(process.env.NODE_PORT, () => {
  console.log(`- Server listening on port ${process.env.NODE_PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ err: err.stack });
});

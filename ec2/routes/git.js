const shell = require("shelljs");

module.exports = express => {
  const router = express.Router();

  router.post("/update", (req, res) => {
    console.log(req.method.cyan, req.originalUrl);

    res.send({ message: "received" });
    return shell.exec(process.env.WEBHOOK_PATH);
  });

  return router;
};

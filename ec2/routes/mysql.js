const mysql = require("mysql");
const { promisify } = require("util");

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  timezone: "utc",
};

const conn = mysql.createConnection(dbConfig);
const query = promisify(conn.query).bind(conn);

conn.connect();

function serverAlive() {
  setTimeout(async () => {
    try {
      await query("SELECT 1");
      serverAlive();
    } catch (err) {
      console.error(err);
    }
  }, 25200000);
}

serverAlive();

module.exports = express => {
  const router = express.Router();

  router.post("/buyItem", async (req, res, next) => {
    console.log(req.method.cyan, req.originalUrl);

    try {
      const start = Date.now();
      const { products, userId } = req.body;
      const productIds = [];
      const productMap = {};

      products.forEach(item => {
        productIds.push(item.productId);
        productMap[item.productId] = item.quantity;
      });

      let selectTime = Date.now();
      const productsQuery = await query("SELECT id, productName, quantity, price FROM product WHERE id IN ?", [
        [products.map(item => item.productId)],
      ]);
      selectTime = Date.now() - selectTime;

      let totalPrice = 0;
      productsQuery.forEach(item => {
        if (item.quantity < productMap[item.id]) {
          throw new Error(`${item.productName} quantity is less than amount ordered`);
        }
        totalPrice += productMap[item.id] * item.price;
      });

      let transactionTime = Date.now();
      try {
        await query("START TRANSACTION;");

        const result = await query("INSERT INTO `order` (totalPrice, userId) VALUES (?,?);", [totalPrice, userId]);

        const productOrders = products.map(item => [item.productId, result.insertId, item.quantity]);

        await query("INSERT INTO productOrder (productId, orderId, num) VALUES ?;", [productOrders]);
        await query("COMMIT;");
      } catch (e) {
        await query("ROLLBACK;");
        return next(e);
      }
      transactionTime = Date.now() - transactionTime;

      return res.send({
        message: "success",
        processTime: Date.now() - start,
        selectTime,
        transactionTime,
      });
    } catch (e) {
      return next(e);
    }
  });

  return router;
};

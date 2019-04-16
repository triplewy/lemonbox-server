const mysql = require("mysql");
const { promisify } = require("util");

const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  timezone: "utc",
};

const pool = mysql.createPool({
  connectionLimit: 500,
  ...dbConfig,
});

const getConnection = promisify(pool.getConnection).bind(pool);
const poolQuery = promisify(pool.query).bind(pool);

function serverAlive() {
  setTimeout(async () => {
    try {
      await poolQuery("SELECT 1");
      serverAlive();
    } catch (err) {
      console.error(err);
    }
  }, 25200000);
}

serverAlive();

module.exports = express => {
  const router = express.Router();

  router.post("/buy", async (req, res, next) => {
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

      const conn = await getConnection();
      const query = promisify(conn.query).bind(conn);
      const productsQuery = await query("SELECT id, productName, quantity, price FROM product WHERE id IN ?", [
        [products.map(item => item.productId)],
      ]);

      let totalPrice = 0;
      productsQuery.forEach(item => {
        if (item.quantity < productMap[item.id]) {
          throw new Error(`${item.productName} quantity is less than amount ordered`);
        }
        totalPrice += productMap[item.id] * item.price;
      });

      try {
        await query("START TRANSACTION;");

        const result = await query("INSERT INTO `order` (totalPrice, userId) VALUES (?,?);", [totalPrice, userId]);

        const productOrders = products.map(item => [item.productId, result.insertId, item.quantity]);

        await query("INSERT INTO productOrder (productId, orderId, num) VALUES ?;", [productOrders]);
        await query("COMMIT;");
        conn.release();
      } catch (e) {
        await query("ROLLBACK;");
        conn.release();
        return next(e);
      }

      return res.send({
        message: "success",
        processTime: Date.now() - start,
      });
    } catch (e) {
      return next(e);
    }
  });

  return router;
};

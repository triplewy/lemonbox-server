const AWS = require("aws-sdk");
const uuidv1 = require("uuid/v1");

AWS.config.update({ region: "cn-north-1" });

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = express => {
  const router = express.Router();

  router.post("/buy", async (req, res, next) => {
    console.log(req.method.cyan, req.originalUrl);

    try {
      const start = Date.now();
      const { products, userId } = req.body;
      if (products.length > 9) {
        throw new Error("Can only purchase 9 different products");
      }

      await updateItems(products);

      await purchaseTransaction(products, userId);

      return res.send({
        message: "success",
        processTime: Date.now() - start,
      });
    } catch (e) {
      if (e.code === "TransactionCanceledException") {
        const { products } = JSON.parse(req.body);
        await rollbackUpdates(products);
      }
      return next(e);
    }
  });

  return router;
};

async function updateItems(items) {
  const promises = items.map(item => {
    return new Promise(async resolve => {
      try {
        const params = {
          TableName: "CheckoutTable",
          Key: {
            pk: "product",
            sk: item.productId,
          },
          UpdateExpression: "SET #quantityLeft = #quantityLeft - :quantity",
          ConditionExpression: "#quantityLeft >= :quantity",
          ExpressionAttributeNames: {
            "#quantityLeft": "quantityLeft",
          },
          ExpressionAttributeValues: {
            ":quantity": item.quantity,
          },
        };

        await docClient.update(params).promise();
        return resolve({ success: true, item });
      } catch (e) {
        console.log(e);
        return resolve({ success: false, item });
      }
    });
  });

  const result = await Promise.all(promises);

  const successes = result.filter(item => item.success);
  const failures = result.filter(item => !item.success);

  if (failures.length > 0) {
    await rollbackUpdates(successes);
    throw new Error(`Not enough items available for ${failures}`);
  }
}

function rollbackUpdates(items) {
  const promises = items.map(({ item }) => {
    const params = {
      TableName: "CheckoutTable",
      Key: {
        pk: "product",
        sk: item.productId,
      },
      UpdateExpression: "SET #quantityLeft = #quantityLeft + :quantity",
      ExpressionAttributeNames: {
        "#quantityLeft": "quantityLeft",
      },
      ExpressionAttributeValues: {
        ":quantity": item.quantity,
      },
    };

    return docClient.update(params).promise();
  });

  return Promise.all(promises);
}

function purchaseTransaction(items, userId) {
  const orderId = uuidv1();
  const now = new Date().toISOString();

  const puts = items.map(item => ({
    Put: {
      TableName: "CheckoutTable",
      Item: {
        pk: item.productId,
        sk: `orderedAt:${now}#orderId:${orderId}`,
        quantity: item.quantity,
        orderId,
        userId,
      },
    },
  }));

  const params = {
    TransactItems: [
      ...puts,
      {
        Put: {
          TableName: "CheckoutTable",
          Item: {
            pk: userId,
            sk: now,
            items,
            orderId,
            ordered_at: now,
            hasShipped: 0,
          },
        },
      },
    ],
  };

  return docClient.transactWrite(params).promise();
}

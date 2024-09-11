var express = require("express");
const { walletConnectSigner } = require("../service/signer");
var router = express.Router();

let status = "wait";
let error = "";

async function monitorApproveStatus(approval) {
  // 等待设备配对
  try {
    const session = await approval().catch((error) => {
      console.log("Pairing was rejected or failed:", error.message);
      status = "error";
      error = error.message;
    });

    // 检查 session 是否存在，并捕获任何异常
    if (session && session.topic) {
      walletConnectSigner.setTopic(session.topic);
      console.log("Device paired successfully:", session);
      status = "success";
    } else {
      console.error("Session is undefined or invalid, pairing failed.");
      status = "failed";
      error = "Session is undefined or invalid, pairing failed.";
    }
  } catch (e) {
    console.error(e);
  }
}

/* GET pairing uri. */
router.get("/pairing", async function (req, res, next) {
  try {
    const { uri, approval } = await walletConnectSigner.generateUriAndPair();
    monitorApproveStatus(approval);
    res.json({ code: 200, data: uri, message: "" });
  } catch (error) {
    res.json({ code: 500, data: "", message: error.message });
  }
});

/**
 * GET sign message.
 *   */
router.post("/message", async function (req, res, next) {
  const { address, message } = req.body;
  try {
    const signature = await walletConnectSigner.signPersonalMessage(
      address,
      message
    );
    res.json({ code: 200, data: signature, message: "" });
  } catch (error) {
    res.json({ code: 500, data: "", message: error.message });
  }
});

/**
 * GET pairing status
 */
router.post("/verify", async function (req, res, next) {
  const { signature, message, address } = req.body;
  let result = await walletConnectSigner.verifyPersonalMessage(
    address,
    message,
    signature
  );
  res.json({ code: 200, data: result, message: error });
});

/**
 * GET pairing status
 */
router.get("/status", async function (req, res, next) {
  res.json({ code: 200, data: status, message: error });
});

module.exports = router;

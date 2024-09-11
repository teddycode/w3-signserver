const { SignClient } = require("@walletconnect/sign-client");
const { log } = require("debug");
const { ethers } = require("ethers"); // 引入 ethers.js

class WalletConnectSigner {
  constructor() {
    this.signClient = null;
    this.pairingTopic = null;
  }

  // 设置topic
  async setTopic(topic) {
    this.pairingTopic = topic;
  }

  // 创建 SignClient 对象
  async createSignClient() {
    try {
      this.signClient = await SignClient.init({
        projectId: "0176e783e7c5b0713450333ff866c2d6",
        relayUrl: "wss://relay.buaadcl.tech:15566",
        metadata: {
          name: "测试的连接端",
          description: "测试的描述符",
          url: "https://your-dapp-url.com",
          icons: [
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRP9fy5-QNpKRSWAtMw1WqC4twnkQyJbaXjA&s",
          ],
        },
      });

      // 监听会话提议
      this.signClient.on("session_proposal", (proposal) => {
        console.log("Session proposal received:", proposal);
      });

      // 监听会话被拒绝
      this.signClient.on("session_rejection", (rejection) => {
        console.log("Session was rejected by the wallet:", rejection);
      });
    } catch (error) {
      console.error("Failed to create SignClient:", error);
      throw error;
    }
  }

  // 生成 URI 并等待设备配对
  async generateUriAndPair() {
    try {
      const { uri, approval } = await this.signClient.connect({
        requiredNamespaces: {
          eip155: {
            methods: ["personal_sign"],
            chains: ["eip155:1"], // Ethereum Mainnet
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });

      // 输出 URI，用于钱包扫描
      console.log("Generated URI:", uri);
      console.log("Waiting for wallet pairing...");
      return { uri, approval };
    } catch (error) {
      console.error("Failed to generate URI and pair device:", error);
      return { undefined, undefined };
    }
  }

  // 发起 Ethereum 个人消息签名请求
  async signPersonalMessage(address, message) {
    if (!this.pairingTopic) {
      throw new Error("No pairing topic found.");
    }

    try {
      const result = await this.signClient.request({
        topic: this.pairingTopic,
        chainId: "eip155:1", // Ethereum Mainnet
        request: {
          method: "personal_sign",
          params: [address, message],
        },
      });
      return result;
    } catch (error) {
      console.error("Failed to sign personal message:", error);
      throw error;
    }
  }

  // 验证签名
  async verifyPersonalMessage(address, message,signature) {
    try {
      // 使用 ethers.js 从签名中恢复出签名者的地址
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() === address.toLowerCase()) {
        console.log("Signature is valid.");
        return true;
      } else {
        console.error(
          "Invalid signature. Recovered address:",
          recoveredAddress
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to verify signature:", error);
      return false;
    }
  }
}

// 实例化 WalletConnectSigner
const walletConnectSigner = new WalletConnectSigner();

// 创建 SignClient
walletConnectSigner
  .createSignClient()
  .then(() => {
    console.log("SignClient created.");
  })
  .catch((error) => {
    console.error(error);
  });

// 全局捕获未处理的 Promise 拒绝
process.on("unhandledRejection", (reason, promise) => {
  if (promise?.code === -32601) return;
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

module.exports = {
  walletConnectSigner,
};

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { blockchainListener } from "./listener";
import { sweepOrchestrator } from "./sweep";
import { payoutOrchestrator } from "./payout";

const app = express();
app.use(cors());
app.use(express.json());

// Security middleware
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers["x-internal-secret"];
  if (config.internalSecret && secret !== config.internalSecret) {
    res.status(401).json({ error: "Unauthorized internal call" });
    return;
  }
  next();
}

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "kompat-crypto-custody",
    chainId: config.chainId,
    evmRpcUrl: config.evmRpcUrl,
    trackedAddressesCount: blockchainListener.getAllTrackedAddresses().length,
  });
});

app.post("/tracking/register", authMiddleware, (req: Request, res: Response) => {
  const { address, userId, currencyCode, networkCode, salt } = req.body;
  if (!address || !userId) {
    res.status(400).json({ error: "Missing address or userId" });
    return;
  }

  blockchainListener.registerAddress({
    address,
    userId: Number(userId),
    currencyCode: currencyCode || "USDT",
    networkCode: networkCode || "ethereum",
    salt: salt || "0x0",
  });

  res.json({ success: true, message: "Address registered for real-time monitoring" });
});

app.post("/sweep/enqueue", authMiddleware, (req: Request, res: Response) => {
  const { depositTxHash, depositAddress, salt, tokenAddress } = req.body;
  if (!depositTxHash || !depositAddress || !tokenAddress) {
    res.status(400).json({ error: "Missing required sweep params" });
    return;
  }

  sweepOrchestrator.enqueueSweep({
    depositTxHash,
    depositAddress,
    salt,
    tokenAddress,
  });

  res.json({ success: true, message: "Enqueued for next batch sweep" });
});

app.post("/sweep/trigger", authMiddleware, async (req: Request, res: Response) => {
  const { tokenAddress } = req.body;
  if (!tokenAddress) {
    res.status(400).json({ error: "Missing tokenAddress" });
    return;
  }

  try {
    const sweepTxHash = await sweepOrchestrator.executeBatchSweep(tokenAddress);
    res.json({ success: true, sweepTxHash });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/payout/broadcast", authMiddleware, async (req: Request, res: Response) => {
  const recipientAddress = req.body.recipientAddress || req.body.recipient_address;
  const tokenAddress = req.body.tokenAddress || req.body.token_address;
  const amount = req.body.amount;

  if (!recipientAddress || !amount) {
    res.status(400).json({ error: "Missing recipient_address or amount" });
    return;
  }

  try {
    const result = await payoutOrchestrator.broadcastPayout({
      recipientAddress,
      tokenAddress,
      amount,
    });
    res.json({ success: true, tx_hash: result.txHash, txHash: result.txHash });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(config.port, () => {
  console.log(`[Custody] Service running on port ${config.port}`);
  blockchainListener.start();
});

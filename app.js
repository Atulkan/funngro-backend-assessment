const express = require("express");
const mongoose = require("mongoose");
const Wallet = require("./models/Wallet");
const {createWithdrawal} = require("./services/payoutServices");
const withdrawalRoutes = require("./routes/Withdrawal");

// Production withdrawal route
// Mount only after real authentication middleware.
// Authentication must set req.user.id.
// Example: app.use("/api", requireAuth, withdrawalRoutes);

require("dotenv").config();

const app = express();

app.use(express.json());
// app.use("/api", requireAuth, withdrawalRoutes);

const PORT = process.env.PORT || 5000;
console.log("Mongo URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, {
    retryWrites: false
})
.then(() => {
    console.log("MongoDB Connected");
    console.log(
        "Retry Writes:",
        mongoose.connection.client.options.retryWrites
    );
})
.catch((error) => {
    console.log("MongoDB Error:", error);
});

// -----------------------------------------------------
// routes requires-------------------------------



// -----------------------------------------------------

app.get("/", (req, res)=>{
    res.send("Funngro withdrawal API running");
});


app.post("/test/create-wallet", async (req, res) => {
    try {
        const wallet = await Wallet.create({
            userId: new mongoose.Types.ObjectId(),
            availableBalance: 500000,
            reservedBalance: 0
        });

        res.status(201).json({
            message: "Wallet created successfully",
            wallet: wallet
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// ---------------------------------------------------


app.post("/test/withdraw", async (req, res) => {
  try {
    const { userId, amountPaise, idempotencyKey } = req.body;

    const withdrawal = await createWithdrawal(
      userId,
      amountPaise,
      idempotencyKey
    );

    res.status(201).json({
      message: "Withdrawal request created",
      withdrawal
    });

  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});



app.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});
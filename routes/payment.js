const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const auth = require("../middleware/auth");
const User = require("../models/User");
const dotenv = require("dotenv");

dotenv.config();

// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// @route   POST /payment/checkout
// @desc    Create a checkout session for the Pro plan
// @access  Private
router.post("/checkout", auth, async (req, res) => {
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            customer_email: req.user.email,
            line_items: [
                {
                    price: process.env.STRIPE_PRO_PLAN_PRICE_ID, // Set in Stripe Dashboard
                    quantity: 1,
                },
            ],
            success_url: `${process.env.CLIENT_URL}/dashboard?success=true`,
            cancel_url: `${process.env.CLIENT_URL}/pricing`,
            metadata: { userId: req.user.userId },
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ message: "Failed to create checkout session" });
    }
});

// @route   POST /payment/webhook
// @desc    Handle Stripe webhooks for subscription updates
// @access  Public
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];

    try {
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        if (event.type === "checkout.session.completed") {
            const session = event.data.object;
            const userId = session.metadata.userId;

            await User.findByIdAndUpdate(userId, { plan: "pro" });
            console.log(`User ${userId} upgraded to Pro`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error("Error handling webhook:", error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
});

module.exports = router;

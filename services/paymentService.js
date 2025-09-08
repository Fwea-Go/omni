const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    static pricingTiers = {
        'price_1S4NnmJ2Iq1764pCjA9xMnrn': {
            name: 'Single Track',
            amount: 499, // $4.99 in cents
            currency: 'usd',
            type: 'one_time'
        },
        'price_1S4NpzJ2Iq1764pCcZISuhug': {
            name: 'DJ Pro',
            amount: 2999, // $29.99 in cents
            currency: 'usd',
            type: 'recurring'
        },
        'price_1S4Nr3J2Iq1764pCzHY4zIWr': {
            name: 'Studio Elite',
            amount: 9999, // $99.99 in cents
            currency: 'usd',
            type: 'recurring'
        },
        'price_1S4NsTJ2Iq1764pCCbru0Aao': {
            name: 'Studio Day Pass',
            amount: 999, // $9.99 in cents
            currency: 'usd',
            type: 'one_time'
        }
    };

    static async createPaymentIntent(priceId, jobId, customerId = null) {
        try {
            if (!process.env.STRIPE_SECRET_KEY) {
                console.warn('Stripe not configured, returning mock payment intent');
                return {
                    client_secret: 'mock_client_secret_for_testing',
                    id: 'mock_payment_intent_id'
                };
            }

            const tier = this.pricingTiers[priceId];
            if (!tier) {
                throw new Error('Invalid price ID');
            }

            if (tier.type === 'recurring') {
                // Handle subscriptions
                return await this.createSubscription(priceId, customerId, jobId);
            } else {
                // Handle one-time payments
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: tier.amount,
                    currency: tier.currency,
                    metadata: {
                        jobId: jobId,
                        tierName: tier.name,
                        priceId: priceId
                    },
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                return paymentIntent;
            }
        } catch (error) {
            console.error('Payment intent creation error:', error);
            throw error;
        }
    }

    static async createSubscription(priceId, customerId, jobId) {
        try {
            let customer;

            if (customerId) {
                customer = await stripe.customers.retrieve(customerId);
            } else {
                customer = await stripe.customers.create({
                    metadata: {
                        jobId: jobId
                    }
                });
            }

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: [{
                    price: priceId,
                }],
                payment_behavior: 'default_incomplete',
                payment_settings: { save_default_payment_method: 'on_subscription' },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    jobId: jobId,
                    tierName: this.pricingTiers[priceId].name
                }
            });

            return {
                subscriptionId: subscription.id,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                customerId: customer.id
            };
        } catch (error) {
            console.error('Subscription creation error:', error);
            throw error;
        }
    }

    static async handleWebhook(req) {
        if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
            console.warn('Stripe webhook not configured');
            return;
        }

        try {
            const sig = req.headers['stripe-signature'];
            const event = stripe.webhooks.constructEvent(
                req.body, 
                sig, 
                process.env.STRIPE_WEBHOOK_SECRET
            );

            switch (event.type) {
                case 'payment_intent.succeeded':
                    await this.handlePaymentSuccess(event.data.object);
                    break;

                case 'invoice.payment_succeeded':
                    await this.handleSubscriptionPayment(event.data.object);
                    break;

                case 'customer.subscription.deleted':
                    await this.handleSubscriptionCancelled(event.data.object);
                    break;

                case 'payment_intent.payment_failed':
                    await this.handlePaymentFailed(event.data.object);
                    break;

                default:
                    console.log(`Unhandled webhook event type: ${event.type}`);
            }
        } catch (error) {
            console.error('Webhook handling error:', error);
            throw error;
        }
    }

    static async handlePaymentSuccess(paymentIntent) {
        const jobId = paymentIntent.metadata.jobId;

        if (jobId) {
            try {
                const ProcessingJob = require('../models/ProcessingJob');
                await ProcessingJob.findByIdAndUpdate(jobId, {
                    isPaid: true,
                    paymentId: paymentIntent.id,
                    paidAt: new Date()
                });
                console.log(`✅ Payment successful for job: ${jobId}`);
            } catch (error) {
                console.error('Error updating payment status:', error);
            }
        }
    }

    static async handleSubscriptionPayment(invoice) {
        try {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
            const jobId = subscription.metadata.jobId;

            if (jobId) {
                const ProcessingJob = require('../models/ProcessingJob');
                await ProcessingJob.findByIdAndUpdate(jobId, {
                    isPaid: true,
                    subscriptionId: subscription.id,
                    paidAt: new Date()
                });
                console.log(`✅ Subscription payment successful for job: ${jobId}`);
            }
        } catch (error) {
            console.error('Error handling subscription payment:', error);
        }
    }

    static async handleSubscriptionCancelled(subscription) {
        console.log(`📋 Subscription cancelled: ${subscription.id}`);
        // Handle subscription cancellation logic here
    }

    static async handlePaymentFailed(paymentIntent) {
        const jobId = paymentIntent.metadata.jobId;

        if (jobId) {
            try {
                const ProcessingJob = require('../models/ProcessingJob');
                await ProcessingJob.findByIdAndUpdate(jobId, {
                    paymentFailed: true,
                    paymentError: paymentIntent.last_payment_error?.message
                });
                console.log(`❌ Payment failed for job: ${jobId}`);
            } catch (error) {
                console.error('Error updating payment failure:', error);
            }
        }
    }

    static async createCustomer(email, name) {
        if (!process.env.STRIPE_SECRET_KEY) {
            return { id: 'mock_customer_id' };
        }

        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    created_via: 'fwea-i-platform'
                }
            });

            return customer;
        } catch (error) {
            console.error('Customer creation error:', error);
            throw error;
        }
    }

    static async getCustomerSubscriptions(customerId) {
        if (!process.env.STRIPE_SECRET_KEY) {
            return [];
        }

        try {
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active'
            });

            return subscriptions.data;
        } catch (error) {
            console.error('Subscription retrieval error:', error);
            throw error;
        }
    }

    static async cancelSubscription(subscriptionId) {
        if (!process.env.STRIPE_SECRET_KEY) {
            return { id: subscriptionId, status: 'canceled' };
        }

        try {
            const subscription = await stripe.subscriptions.cancel(subscriptionId);
            return subscription;
        } catch (error) {
            console.error('Subscription cancellation error:', error);
            throw error;
        }
    }
}

module.exports = PaymentService;

import { KnowledgeBase } from './types';

export const KNOWLEDGE_BASE_JSON: KnowledgeBase = {
  brands: [
    {
      brand_name: "Urban Streak",
      keywords: ["urban", "streak", "apparel", "clothing", "fashion"],
      categories: [
        {
          category_name: "Returns & Exchanges",
          faqs: [
            {
              question: "What is your return policy?",
              answer: "You can return any unworn, unwashed item within 30 days of purchase for a full refund. Items must have original tags attached."
            },
            {
              question: "How do I start an exchange?",
              answer: "To start an exchange, please visit our online returns portal. You will need your order number and email address. Exchanges are processed once we receive the original item."
            },
            {
              question: "Are returns free?",
              answer: "Yes, we offer free returns for all domestic orders. A prepaid shipping label will be provided through our returns portal."
            }
          ],
          policies: [
            {
              policy_name: "30-Day Return Policy",
              details: "All returns must be initiated within 30 days of the delivery date. Final sale items are not eligible for returns or exchanges. A restocking fee of $5 may apply to returns without original packaging."
            }
          ]
        },
        {
          category_name: "Shipping",
          faqs: [
            {
              question: "What are your shipping options?",
              answer: "We offer Standard (5-7 business days), Expedited (2-3 business days), and Overnight shipping."
            },
            {
              question: "Do you ship internationally?",
              answer: "Yes, we ship to over 50 countries. International shipping costs and times vary by destination."
            }
          ],
          policies: [
            {
              policy_name: "Free Shipping Offer",
              details: "We offer free standard shipping on all domestic orders over $75."
            }
          ]
        }
      ]
    },
    {
      brand_name: "Barbary Lion",
      keywords: ["barbary", "lion", "luxury", "leather", "bags"],
      categories: [
        {
          category_name: "Product Care",
          faqs: [
            {
              question: "How do I care for my leather bag?",
              answer: "We recommend using a specialized leather cleaner and conditioner. Avoid prolonged exposure to direct sunlight and water. Store in the provided dust bag when not in use."
            }
          ],
          policies: []
        },
        {
            category_name: "Warranty",
            faqs: [
              {
                question: "Do your products have a warranty?",
                answer: "Yes, all our products come with a 2-year warranty covering manufacturing defects."
              }
            ],
            policies: [
              {
                policy_name: "2-Year Limited Warranty",
                details: "The warranty covers defects in materials and workmanship for two years from the original date of purchase. It does not cover damage caused by accidents, improper care, or normal wear and tear."
              }
            ]
          }
      ]
    },
    {
      brand_name: "FitMax Apparel",
      keywords: ["fitmax", "fitness", "gym", "activewear", "sports"],
      categories: [
        {
          category_name: "Sizing",
          faqs: [
            {
              question: "How do I find my size?",
              answer: "Please refer to the size chart available on each product page. Our activewear is designed for a snug, athletic fit. If you are between sizes, we recommend sizing up."
            }
          ],
          policies: []
        },
        {
            category_name: "Fabric Technology",
            faqs: [
              {
                question: "What are your clothes made of?",
                answer: "Our apparel uses our proprietary sweat-wicking and quick-drying fabric blend, designed to keep you cool and comfortable during any workout."
              }
            ],
            policies: []
        }
      ]
    },
    {
      brand_name: "NovaTech",
      keywords: ["novatech", "tech", "device", "support", "electronics", "gadget", "password", "reset", "troubleshoot", "hardware"],
      categories: [
        {
          category_name: "Product Support",
          faqs: [
            {
              question: "How do I troubleshoot common device issues?",
              answer: "To troubleshoot common issues with your NovaTech device, start by restarting the power. Make sure your device has the latest firmware updates installed. If it is still unresponsive, try performing a soft reset by holding down the power button for 10 seconds, or consult the troubleshooting section of your user manual."
            }
          ],
          policies: []
        },
        {
          category_name: "Account Management",
          faqs: [
            {
              question: "How do I reset my password?",
              answer: "To reset your NovaTech account password, click on the 'Forgot Password' link on the login screen. Enter your registered email address, and we will send you a secure link with step-by-step instructions to create a new password."
            }
          ],
          policies: []
        }
      ]
    }
  ]
};

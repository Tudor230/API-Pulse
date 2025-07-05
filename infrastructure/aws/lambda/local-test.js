// Simple local test for the Lambda function
// Run this from the lambda directory: node local-test.js

require("dotenv").config({ path: "../.env" });

// Import the handler
const { handler } = require(".");

// Simple test event
const testEvent = {
  Records: [
    {
      messageId: "test-123",
      body: JSON.stringify({
        messageId: "test-123",
        messageType: "MONITOR_CHECK",
        version: "1.0",
        timestamp: new Date().toISOString(),
        source: "test",
        retryCount: 0,
        maxRetries: 3,
        payload: {
          monitorId: "test-monitor",
          userId: "test-user",
          monitorData: {
            name: "Test Monitor",
            url: "https://httpbin.org/status/200",
            expectedStatus: "up",
            intervalMinutes: 5,
            timeoutSeconds: 10,
          },
          checkConfig: {
            priority: "normal",
            scheduledAt: new Date().toISOString(),
            expectedDuration: 5000,
            userAgent: "API-Pulse-Test/1.0",
          },
        },
      }),
    },
  ],
};

async function test() {
  console.log("🚀 Testing Lambda function...");

  try {
    const result = await handler(testEvent);
    console.log("✅ Test successful!");
    console.log("Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

test();

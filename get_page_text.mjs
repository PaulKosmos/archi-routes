// Import modules as namespaces
import * as sdkClient from '@modelcontextprotocol/sdk/client';
import * as sdkServer from '@modelcontextprotocol/sdk/server';

// Define the main async function to run our logic
async function getPageText() {
  console.log('Initializing MCP client and Playwright server...');

  // Configure the client to start the Playwright server process
  const client = new sdkClient.McpClient({
    servers: [
      new sdkServer.McpServerProcess({
        // A name for the server for logging purposes
        name: 'playwright',
        // The command to start the server
        command: 'npx',
        // The arguments for the command
        args: ['-y', '@executeautomation/playwright-mcp-server'],
      }),
    ],
  });

  try {
    // Start the client and the associated Playwright server
    await client.start();
    console.log('Client and server started. Navigating to page...');

    // 1. Navigate to the specified URL
    const navigateResult = await client.tool('playwright', 'Playwright_navigate', {
      url: 'http://localhost:3000/test-map',
    });
    console.log('Navigation result:', navigateResult);

    // 2. Get the visible text from the page
    console.log('Getting visible text...');
    const textResult = await client.tool('playwright', 'playwright_get_visible_text', {});

    console.log('--- REAL PAGE TEXT ---');
    // The actual text is nested in the result object
    console.log(textResult.text);
    console.log('--- END OF TEXT ---');

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Ensure the client and server are stopped
    console.log('Stopping client and server...');
    await client.stop();
    console.log('Stopped.');
  }
}

// Execute the main function
getPageText();
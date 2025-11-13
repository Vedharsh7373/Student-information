// /api/entry.js

const axios = require('axios');
const cors = require('cors');

// The URL of your Google Apps Script Web App
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYkLyBOcknop-Tjeeaj_gV8ylHtQZ5c89Va4nycNhCTT8MCveYMwO8h6UTfVSKiHk/exec";

// Initialize CORS middleware - TEMPORARY BYPASS FOR TESTING
// This allows all origins (less secure) but is necessary to confirm the proxy function works.
// ONCE IT WORKS, CHANGE THIS BACK TO THE STRICT ALLOWED_ORIGINS LIST!
const corsMiddleware = cors({
    origin: '*', // Allows all origins
    methods: ['GET', 'POST', 'OPTIONS'],
});

// Helper to run middleware on Vercel's req/res objects
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}


module.exports = async (req, res) => {
    // 1. Run CORS middleware to set required headers
    try {
        await runMiddleware(req, res, corsMiddleware);
    } catch (error) {
        // This is unlikely with the '*' bypass, but kept for robustness
        res.status(403).json({ success: false, message: 'CORS policy violation.' });
        return;
    }

    // Handle Pre-flight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // 2. Determine Target URL and method
    let targetUrl = SCRIPT_URL;
    const { method, body, query } = req;
    
    // For GET requests, append query parameters
    if (method === 'GET' && Object.keys(query).length > 0) {
        const queryString = new URLSearchParams(query).toString();
        targetUrl = `${SCRIPT_URL}?${queryString}`;
    }

    // 3. Forward the Request to Google Apps Script
    try {
        const response = await axios({
            method: method.toLowerCase(),
            url: targetUrl,
            // Vercel pre-parses the body for us
            data: method === 'POST' ? body : undefined,
            headers: {
                'Content-Type': 'application/json',
            }
        });

        // 4. Send the Apps Script response back to the client
        res.status(response.status).json(response.data);

    } catch (error) {
        console.error("Proxy Error:", error.message);
        
        // Handle error response from the Apps Script
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { message: 'Internal Server Error (Proxy failure).' };
        
        res.status(status).json({ success: false, ...data });
    }
};

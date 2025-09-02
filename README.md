# Gemini-CLI-Chat

Gemini CLI Web Interface
A web-based interface for interacting with the Gemini CLI or Google Gemini API, providing a chat-like experience similar to Grok. The application supports long text inputs and outputs, with a modern, responsive UI built using Tailwind CSS. It includes HTTP Basic Authentication for secure access, making it suitable for developers and startups needing a private AI chat interface.
Features

Chat Interface: User-friendly, Grok-like conversation UI with user messages on the right and Gemini responses on the left.
Long Output Support: Handles large inputs and outputs, with proper text wrapping and scrolling.
Secure Access: HTTP Basic Authentication to restrict access to authorized users.
Responsive Design: Optimized for both desktop and mobile devices using Tailwind CSS.
Clear Chat History: Option to clear conversation history with a single click.
Enter Key Submission: Supports submitting queries with the Enter key.
Error Handling: Displays errors clearly in the UI and logs them for debugging.

Prerequisites

Node.js: Version 16 or higher.
Gemini CLI: Installed at /usr/bin/gemini (optional if using Google Gemini API).
Google Gemini API Key: Required for Gemini CLI or direct API usage.
NPM: For installing dependencies.
Linux Server: Tested on Linux (e.g., Ubuntu), with sudo access for running the server.

Installation

Clone the Repository (or create the project structure):
git clone <repository-url>
cd geminicliweb

If not using a repository, create a directory:
mkdir geminicliweb
cd geminicliweb
mkdir public


Install Dependencies:
npm install express cors dotenv

If using the Google Gemini API alternative:
npm install express cors axios dotenv


Set Up Environment Variables:Create a .env file in the project root:
echo 'AUTH_USERNAME=admin' >> .env
echo 'AUTH_PASSWORD=your_secure_password' >> .env
echo 'GEMINI_API_KEY=your_gemini_api_key' >> .env


Replace your_secure_password with a strong password (at least 12 characters, including letters, numbers, and symbols).
Replace your_gemini_api_key with your Google Gemini API key or the key used by Gemini CLI.


Save Configuration Files:

Save the provided index.js to geminicliweb/index.js.
Save the provided index.html to geminicliweb/public/index.html.


Ensure Gemini CLI (Optional):If using Gemini CLI, verify it’s installed:
gemini -v

Ensure /usr/bin/gemini is executable:
ls -l /usr/bin/gemini



Usage

Run the Server:
cd geminicliweb
sudo -E -u root node index.js

Or, if GEMINI_API_KEY is not in .env:
export GEMINI_API_KEY=your_gemini_api_key
sudo -u root env GEMINI_API_KEY=$GEMINI_API_KEY node index.js

The server will run at http://<服务器IP>:3000.

Access the Web Interface:

Open http://<服务器IP>:3000 in a browser.
Enter the username (admin) and password (from .env) when prompted.
Type a query in the input box, press "发送" or Enter to submit.
View responses in the chat interface, with user messages on the right and Gemini responses on the left.
Click "清空" to reset the conversation history.


API Access:Test the API using curl:
curl -u admin:your_secure_password -X POST http://<服务器IP>:3000/api/gemini -H "Content-Type: application/json" -d '{"input":"hi"}'

Replace your_secure_password with the password from .env.


Troubleshooting

Long Output Errors:

If you see Usage: gemini [options] [command], the Gemini CLI may be failing due to long inputs/outputs. Try the alternative index.js using the Google Gemini API (see below).
Check logs in error.log and terminal output for details.


Authentication Issues:

Ensure .env contains correct AUTH_USERNAME and AUTH_PASSWORD.
Verify login credentials in the browser or curl.


Environment Variables:

Confirm GEMINI_API_KEY is set:echo $GEMINI_API_KEY
sudo -E -u root env | grep GEMINI_API_KEY




Resource Limits:

Check file descriptors:ulimit -n

Increase if needed:ulimit -n 4096


Check memory:free -m





Alternative: Using Google Gemini API
If Gemini CLI is unstable for long outputs, use the Google Gemini API directly. Replace index.js with the alternative version (provided in previous responses, ID: 97d4047e-ee24-49ec-8759-6d24521acd85). Install additional dependency:
npm install axios

Run the server as described above. The frontend (index.html) remains compatible.
Project Structure
geminicliweb/
├── index.js          # Node.js server with Gemini CLI or API integration
├── public/
│   └── index.html    # Frontend with Grok-like chat interface
├── .env              # Environment variables (AUTH_USERNAME, AUTH_PASSWORD, GEMINI_API_KEY)
└── error.log         # Server error logs

Contributing
Contributions are welcome! Please submit a pull request or open an issue for suggestions or bug reports.
License
MIT License. See LICENSE for details.

# Food and Wealth (F&w)

**Food and Wealth** is a privacy-focused Chrome Extension that analyzes your spending habits on **Uber Eats** and **DoorDash**. It provides instant insights into your total spend, top cravings, and biggest splurges without ever sending data to a server.

![F&w Promo](fnw.png)

## Features

* **Multi-Platform Support:** Works seamlessly on both Uber Eats and DoorDash order history pages.
* **Instant Analysis:** Calculates total spend, order count, and identifies your top 3 most visited restaurants.
* **Biggest Splurge:** automatically detects and highlights your most expensive single order.
* **Dual-Theme UI:** Features a beautiful Light Mode and a sleek Dark Mode that remembers your preference.
* **Privacy First:** 100% local processing. No data is stored or transmitted.

## How to Run Locally

You can run this extension on your Chrome browser right now in "Developer Mode."

### Prerequisites
* Google Chrome (or Brave/Edge)
* The source code files (`manifest.json`, `popup.html`, `popup.js`, `fnw.png`)

### Installation Steps

1.  **Download/Clone** this repository to a folder on your computer.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click the **Load unpacked** button in the top left.
5.  Select the folder containing your extension files.
6.  The **F&w** icon should appear in your browser toolbar!

## Usage

1.  Log in to your [Uber Eats](https://www.ubereats.com/orders) or [DoorDash](https://www.doordash.com/orders) account.
2.  Navigate to the **Orders** / **Past Orders** page.
3.  Click the **F&w** extension icon.
4.  Click **ANALYZE HISTORY**.
5.  Wait for the scrolling to complete and view your financial insights!

## Privacy

This extension complies with strict privacy standards.
* **Storage:** Data is stored temporarily in `chrome.storage.local` solely for the purpose of displaying results across popup re-opens.
* **Network:** No external network requests are made.
* **Data:** We do not collect, share, or sell your data.

[View Privacy Policy](https://www.termsfeed.com/live/33b69ad3-c072-4b91-9084-d4a7b79bf66a)



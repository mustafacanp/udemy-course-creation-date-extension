# Udemy Course Creation Date Chrome Extension

![Demo of Udemy Course Creation Date Extension](.github/images/demo.png)

_Easily view the creation date of any Udemy course directly on the course page and via the extension popup._

## Installation

1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this project folder.

## Usage

- Visit any Udemy course page (e.g., `https://www.udemy.com/course/...`).
- The creation date will appear below the course title.
- Click the extension icon to view the course creation date in a popup.

## Development

- Main files:
  - `content.js`: Injects creation date into course pages.
  - `popup.html` & `popup.js`: Extension popup UI and logic.
  - `background.js`: Handles badge and extension events.
  - `styles.css`: Styling for injected elements.

---

Made with ❤️ for Udemy learners.

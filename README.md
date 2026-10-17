# DairySafe Intelligence Platform — Simple Website

This is a software-only prototype built with plain HTML, CSS and vanilla JavaScript. It does not require hardware, React, Python, Node.js or a database server.

## Files
- `index.html` — application structure and forms
- `style.css` — responsive styling
- `script.js` — form validation, illustrative screening rules, LocalStorage, traceability, investigations and printable reports

## How to run on Windows
1. Extract the project folder if you downloaded the ZIP.
2. Open the `DairySafe_Website` folder.
3. Double-click `index.html` to open it in Chrome, Edge or another modern browser.
4. Allow pop-ups for the site if you want to open printable reports.

No installation is required. The Google Fonts import in `style.css` is optional; local fallback fonts will be used when offline.

## Suggested demo workflow
1. Open **Batch Traceability** and create a batch with source, quantity and supply-chain details.
2. Open **Milk Quality Analysis**, enter all six values (pH, temperature, density, fat, SNF and conductivity) and select the batch.
3. Click **Analyze milk** and inspect the result card.
4. Open **Analysis History** to view or print the saved sample.
5. Return to **Batch Traceability**, search the batch ID and use forward/backward trace.
6. Open **Risk & Recall Support** and create an investigation linked to the batch/sample.
7. Update the case and laboratory statuses, then print the investigation report.

## Data storage
The prototype stores records in browser LocalStorage. Records are local to that browser profile and computer; they are not synchronized between team members and are not stored on a remote server. Clear browser data may delete records, so do not use it as the only copy of important information.

## Scientific limitation
The first version has no trained machine-learning model and no real labelled dataset. Its configurable ranges in `script.js` are illustrative demonstration triggers only, not regulatory limits, validated thresholds, probabilities or proof of adulteration. The result is labelled **Demonstration Mode — No Validated Model**. Appropriate laboratory testing and real model validation are necessary before drawing real milk-safety conclusions.

## Future improvements
- Train and validate a model using a suitable labelled milk-quality dataset.
- Add backend authentication and central database storage.
- Add real laboratory confirmation records and audit trails.
- Add deployment and hardware integration only if later required.

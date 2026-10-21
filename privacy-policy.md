# Privacy Policy — KidGuard for YouTube

Last updated: October 2026

KidGuard for YouTube is a parental control Chrome extension that runs only on YouTube (youtube.com). It does not collect, store, or transmit any user data.

## What it does

The extension reads YouTube video titles and search query text from the current page — locally, in your browser — to compare against a parent-configured keyword list. This data never leaves your browser.

## What it stores

Your keyword list is saved using chrome.storage.sync, which syncs across your own signed-in Chrome devices via Google's infrastructure. KidGuard never sees or receives this data.

## What it does NOT do

- Does not collect personal information
- Does not track browsing history
- Does not read any website other than youtube.com
- Does not send data to any server, including the developer's
- Does not use analytics, ads, or third-party SDKs

## Permissions

- **storage**: saves your keyword list via Chrome's built-in sync
- **Host permission (youtube.com)**: required to run the content script that checks page content

## Limited Use

KidGuard does not use any user data beyond what is necessary to provide parental content filtering on YouTube. No data is shared with or sold to third parties.

## Contact

For questions or issues: https://github.com/vaibhavmanch3kar/yt-kidguard/issues

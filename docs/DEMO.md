# Standalone university portal demo

Mohammad Ghorbani's university portal can be built as a static demo with synthetic student, staff and administrator accounts. The role selector switches between those accounts. Changes stay in the current browser tab, and Reset restores the starting data.

The sign-in form includes a button to fill the public sample credentials. Registration creates a separate sample student with an `example.test` address and a `DEMO-` student number. The sample password is fixed and the form leaves out national IDs. You can sign out and sign back in as the sample student during the same tab session. Reset clears newly registered demo accounts.

## Build and preview

```sh
npm ci
npm run build:demo
npm run preview:demo
```

Visit `http://127.0.0.1:3010`. Try enrolling in Database, cancelling it, and enrolling again. Book and cancel the group study room. Submit a request as a student, switch to Staff, respond, and switch back to see the response. The demo build excludes Firebase and serves the Vazirmatn font locally under the [SIL Open Font License](../public/licenses/Vazirmatn-OFL.txt).

## Cloudflare Pages

In Workers & Pages, create a Pages project from `MohammadGhorbani-dev/university-student-portal` using these settings.

| Setting | Value |
| --- | --- |
| Project name | `university-portal-showcase` or another available name |
| Production branch for this preview | `codex/portal-security-validation` |
| Build command | `npm run build:demo` |
| Build output directory | `dist-demo` |
| Root directory | Repository root |
| Environment variables | `NODE_VERSION=24` |

Deploy the Pages project and check the build. Under Custom domains, set up `university-demo.mohammadghorbani-dev.ir` and wait for Active and SSL enabled. Then check the home page, reload an internal route such as `/courses`, and try changing roles without VPN on fixed and mobile internet. Pages serves the SPA entry point for internal routes when the output has no top-level 404 page.

[Cloudflare Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/) · [Build settings](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [SPA routing](https://developers.cloudflare.com/pages/configuration/serving-pages/)

## Verification

GitHub Actions builds the Firebase and standalone versions. Desktop and mobile Chromium exercise the demo with external network requests blocked. The hosted demo uses simulated authorization and transactions. Firestore access rules and concurrency are verified in the separate emulator suite.

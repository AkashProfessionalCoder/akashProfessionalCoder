# Profile setup checklist

These are the things only you can change on GitHub. The READMEs and workflows in this repo handle the rest.

## 1. Profile settings (github.com/settings/profile)

- [ ] **Name:** Akash Senthil
- [ ] **Bio** (160 characters max):
  > Flutter & cross-platform mobile engineer @Samaaro · 7+ production apps · Namma Flutter core team · Bengaluru
- [ ] **Company:** `@Samaaro` (or plain "Samaaro")
- [ ] **Location:** Bengaluru, India
- [ ] **Website:** https://akash-senthil-portfolio.vercel.app/ (switch to `akashsenthil.dev` once that domain is live)
- [ ] **Social accounts:** LinkedIn, Medium (`https://medium.com/@akashprocoder`)
- [ ] **Status** (click the smiley on your avatar), e.g. 📱 "Shipping Flutter apps @ Samaaro"
- [ ] **Pronouns:** your choice

> ⚠️ **Which LinkedIn URL is right?** This README links to `linkedin.com/in/akashprofessionalcoder`, but your portfolio's config (`src/app/config/appConfig.ts`) uses `linkedin.com/in/akashprocoder`. Keep whichever one is correct and update the other file.

## 2. Pinned repositories (Customize your pins)

Pin your own work, with the community project last:

1. `akash_senthil_portfolio`
2. `dev_folio`
3. `skill_hub_mobile`
4. `SpotifyUISwift`
5. `routine_tracker_template_creator`
6. `namma_wallet` (fork of the community project)

## 3. Polish each pinned repo

For each one:
- [ ] **Description:** one line covering what it does and the stack
- [ ] **Topics:** `flutter`, `dart`, `swiftui`, `typescript`, `react`, …
- [ ] **Website:** a live demo link, if there is one
- [ ] **README:** add a screenshot or GIF, "Features", "Tech stack" and "Run locally" sections
- [ ] **Social preview image:** Settings → General → Social preview

Suggested descriptions:

| Repo | Description |
|---|---|
| `akash_senthil_portfolio` | Personal portfolio built with React + TypeScript + Vite, using clean architecture |
| `dev_folio` | Developer profile generator: pick a template, fill it in, export |
| `skill_hub_mobile` | Flutter learning platform connecting mentors and learners |
| `SpotifyUISwift` | Spotify UI recreated in SwiftUI |
| `routine_tracker_template_creator` | Create printable routine-tracker templates in the browser |

## 4. Clean up old repositories

Archive these (Settings → Danger Zone → Archive) or make them private. They're empty, tests, or tutorial follow-alongs:

`MSOffice` · `Starting-` · `Flutter_Sample` · `flutterTraining_June_July` · `black-blogs` · `Why0823` · `globalFC` · `updatedRegisterForm`

## 5. Turn on the automation

1. Merge `dev` into `main`. The scheduled workflows only run on the default branch.
2. **Actions → Generate Profile Metrics → Run workflow.** It creates the `metrics` branch with the stats cards and the 3D contribution graph. It runs automatically after that, daily at 00:30 IST.
3. **Actions → Latest Medium Posts → Run workflow.** It refreshes the blog list in both READMEs, and runs daily after that.
4. **Settings → Actions → General → Workflow permissions:** must be **Read and write**.

No personal access token is needed. Everything runs on the default `GITHUB_TOKEN`.

## 6. Switching the default view

`README.md` (Professional) is what your profile shows. To make **Creative** the default:
1. Rename `README.md` → `README-professional.md`, and `README-creative.md` → `README.md`.
2. In both files, update the toggle `href`s at the top so each badge points to the other file.

## 7. Achievements you can unlock naturally

- **Pair Extraordinaire:** co-author a commit (add a `Co-authored-by:` line) on a merged PR
- **Starstruck:** a repo reaching 16 stars (pin and share `dev_folio`!)
- **Galaxy Brain:** have answers accepted in GitHub Discussions (Flutter and community repos)
- **Pull Shark** (next tier): keep merging PRs to open-source projects like Namma Wallet

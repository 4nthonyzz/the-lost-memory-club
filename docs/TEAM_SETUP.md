# Team setup and branching workflow

**Owner:** `4nthonyzz`  
**Repository:** `the-lost-memory-club`  
**Main branch:** `main`

## Create and share the repository

1. Repository owner creates a **public empty** GitHub repository named `the-lost-memory-club` (no auto-generated README, license or `.gitignore`).
2. Owner extracts this scaffold, opens the folder in Kiro IDE, runs `npm install`, validates `npm test && npm run build`, and commits everything including `.kiro/` and the generated `package-lock.json`.
3. Owner pushes to `main`.
4. On GitHub, open **Settings > Collaborators / Collaborators and teams > Add people**. Invite the other two GitHub usernames and have them accept. (UI names may vary.)
5. The two teammates clone the public repo, open it in Kiro IDE, and create their feature branches.
6. Add all three teammates to the Kiroween **Devpost team** separately; GitHub access alone does not register them as hackathon teammates.

## Commands for the repo owner (PowerShell)

```powershell
cd path\to\the-lost-memory-club
npm install
npm test
npm run build
git init -b main
git add .
git commit -m "chore: initialize Kiroween game scaffold and Kiro specs"
git remote add origin https://github.com/4nthonyzz/the-lost-memory-club.git
git push -u origin main
```

If Git is already initialized or a remote is configured, check `git status` and `git remote -v` before repeating setup commands.

## Commands for the teammates

```powershell
git clone https://github.com/4nthonyzz/the-lost-memory-club.git
cd the-lost-memory-club
npm ci
npm run dev
```

After cloning, each person creates **their own branch**:

```powershell
# Developer 1
git switch -c feature/world-exploration
# Developer 2 (in their own clone)
git switch -c feature/haunted-arcade
# Developer 3 (in their own clone)
git switch -c feature/vhs-memory-system
```

## Ownership rules

- `src/world/**`: Developer 1
- `src/arcade/**`: Developer 2
- `src/memories/**`, `src/ui/**`: Developer 3
- `src/core/**`, `.kiro/specs/game-foundation/**`, `package.json`: jointly reviewed changes only
- No direct pushes to `main` after initial bootstrapping.
- One pull request per feature; run `npm test` and `npm run build` before merge.
- Do not independently re-create the core event types in each module.
- Use clear, English commit messages, technical docs, comments, and UI copy.

## Initial Kiro tasks

- Developer 1: refine the world-exploration Spec and implement keyboard navigation, camera and station interactions.
- Developer 2: refine the haunted-arcade Spec and build a real Snake Canvas loop with testable pure rules.
- Developer 3: refine the VHS-memory Spec and implement player transport, clue detection and narrative transitions.
- All three: approve contracts and agree on the first vertical slice before code changes.

## Definition of done

A task is done only when it runs, passes relevant tests, has an updated Spec/task status and can be reviewed from a branch/PR. Do not present the starter's proof-of-concept UI as completed gameplay.

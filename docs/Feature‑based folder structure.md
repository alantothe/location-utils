# Feature‑based folder structure: making large projects more maintainable

## Introduction

When projects are small it is common to place everything in a handful of high‑level folders (e.g., app, components, database, utils). This works for a single page or feature, such as a to‑do app where the form and list components both read and write to a database and check permissions. However, as soon as you add more features like permissions, delete actions or multiple domains (users, products, sales), the number of files in each top‑level folder explodes. Developers often end up refactoring because the complexity of the codebase grows faster than their folder structure can accommodate.

## Problems with traditional structures

- **Shared folders become dumping grounds.** In a typical Next.js or SPA project you might have `app`, `lib`, `api`, `database`, `components` and `utils` folders. Each of these root folders is then subdivided; for example, the components folder might contain global components like a navbar alongside feature‑specific UI, while the database folder holds code for products, users, sales etc.. As features multiply, all these disparate files live side by side.
    
- **Cross‑folder dependencies are hard to track.** Components in the user section may import functions from the product section, and database functions may be used by unrelated features. In a real project the dashboard page needed components for permissions, product grids, charts, forms and even global elements like a back‑button. Because code for each domain is scattered across many folders, it becomes hard to find all pieces of a feature or understand which features depend on one another.
    
- **Scalability issues.** Adding new features increases the number of files in every top‑level folder; the components folder may contain hundreds of files for all features and global elements. As more developers join and the app evolves, these folders become overwhelming and error‑prone.
    

## A feature‑based folder structure

The proposed structure introduces a `features/` directory that contains a subfolder for each domain or feature (e.g., `products`, `users`, `sales`, `auth`). Inside each feature folder you replicate the same subfolders you might have at the root—components, server actions, database access, schemas—**but only for that feature**. Code that is truly global (shared across the entire application) remains in the root‐level folders (e.g., reusable formatting functions or a navbar component). The main application pages (Next.js `app` folder or equivalent) act solely as glue: they import components and functions from the relevant feature folder and assemble the UI, rather than containing feature logic themselves.

### Advantages

- **Isolation of concerns.** Each feature has its own self‑contained folder, so all forms, components, database calls and schemas for a product live together. When you need to modify the product feature you go to `features/products` and find everything there. You no longer have to hunt through a global components folder or a shared server folder..
    
- **Simpler high‑level structure.** The feature‑based version actually has fewer top‑level folders than the original. Folders like `server` or `schemas` disappear because their contents are moved into the appropriate feature. The remaining root‑level folders contain only truly global files.
    
- **Easier refactoring and scaling.** Adding a new capability means adding files within the corresponding feature directory without polluting unrelated sections. Since features do not import from one another, you can refactor one feature without worrying about breaking another.
    

## Data‑flow and dependency rules

This structure encourages a **one‑way data flow**: shared code → feature code → application code. A visual diagram in the video shows green for features, blue for shared code and red for the application. Arrows indicate allowed import directions:

1. **Shared code** (e.g., `lib`, `api`, `database`, `components`, `utils`) is entirely global. It cannot import from features or the application; it only references other shared modules.
    
2. **Feature code** can import from shared code and other files within the same feature folder but **never from other features**. This keeps features independent and reduces coupling.
    
3. **Application code** (pages, routes or UI composition) can import from any feature and from shared code; it glues together the building blocks to assemble the user interface. Features never import from the application.
    

## Enforcing boundaries with ESLint

To ensure these rules are followed, the video uses the _eslint‑plugin‑boundaries_ plugin. The configuration defines categories (`shared`, `feature`, `app` and `never import`) and labels every file inside the `src` folder. Important points from the configuration:

- **No unknown files or imports.** Every file must be labeled, and unknown imports are disallowed.
    
- **Import rules.** Shared code may import from other shared modules; features may import from shared code and from other files in the same feature; application code may import from features and shared code. By default every import is disallowed unless explicitly permitted.
    
- **Never import category.** Files such as middleware or test helpers can be placed in a category that cannot be imported anywhere else. This prevents accidental coupling.
    

The result is that if a developer tries to import a function from `features/users` into `features/products`, ESLint will raise an error. Conversely, importing a shared formatter into a feature or using feature functions in an application page is allowed. This automated enforcement ensures the one‑way dependency flow remains intact even as the team grows.

## Considerations and caveats

While the feature‑based structure improves maintainability, it introduces stricter boundaries. Cross‑feature modules that genuinely need to access multiple features (such as complex permissions logic) may require refactoring. In the example, a permissions file depended on multiple features and had to be restructured into per‑feature permission functions or accept more generic inputs. Writing code within these constraints may initially feel restrictive, but the long‑term gains in clarity, testability and independence outweigh the cost.

## Conclusion

The video advocates moving from a global, file‑type oriented folder structure to a **feature‑oriented** structure. By placing each feature’s components, database calls and other code in its own folder and centralizing truly global logic, you reduce cognitive load and make large projects enjoyable to work on. ESLint rules enforce strict boundaries so that features remain decoupled and all dependencies flow in a single direction. While certain shared utilities may require careful design, this approach scales well and makes refactoring safer.
# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Running as a Deco Studio view

`bun dev` is how screens get developed day to day. To see this app inside the Deco Studio
iframe, it's compiled to a single HTML file (`bun run build:single`) and embedded into the
`mcp-server` assembly — see `apps/mcp-server/README.md`'s "Building the `/web` view bundle"
for the regeneration script and why there's no hot reload for that path.

# Example Code Structure

This directory contains example code for the IBM Aspera JavaScript SDK, organized by functionality.

## File Organization

The example code has been split into separate TypeScript files for better organization and maintainability:

### Core Example Files

- **`initialize.ts`** - SDK initialization with various configuration options
- **`test-connection.ts`** - Testing SDK connectivity
- **`select-items.ts`** - File and folder selection dialogs
- **`image-preview.ts`** - Selecting and previewing image files
- **`start-transfer.ts`** - Starting file transfers
- **`drag-drop.ts`** - Drag and drop functionality
- **`monitor-transfers.ts`** - Monitoring and managing transfers (includes remove, stop, resume, show directory, and transfer info functions)
- **`other-functions.ts`** - Additional SDK functions (get info, show preferences, status callbacks)
- **`installer.ts`** - Installer information and download links

### Main Entry Point

- **`index.ts`** - Main entry point that imports all example functions and makes them available globally on the `window` object for use in the example application

## Usage in the Example App

All example functions are automatically loaded and made available globally when the application starts. The React components in `src/Views/` access these functions via the `window` object.

For example:
```typescript
// In a React component
window.initializeAspera(false, gatewayUrl, false);
window.testAspera();
window.selectItemsAspera(true);
```

## Type Definitions

Type definitions for the window object extensions are located in `src/types/window.d.ts`.

## Building

The example code is bundled with the application during the build process using Vite. The original `public/sdk-code.js` file is no longer used.

To build the example application:
```bash
npm run build
```

To run the development server:
```bash
npm run dev
```

## Benefits of This Structure

1. **Better Organization** - Each use case has its own file, making it easier to find and understand specific functionality
2. **Improved Maintainability** - Changes to one feature don't affect others
3. **Type Safety** - TypeScript provides better type checking and IDE support
4. **Easier Navigation** - Developers can quickly jump to specific examples
5. **Reusability** - Individual example files can be referenced or copied more easily
6. **Documentation** - Each file can have focused documentation for its specific use case

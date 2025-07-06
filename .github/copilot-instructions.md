# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a 3D voxel grid playground with visual feedback using Three.js. The project allows users to:
- Create and manipulate 3D voxel grids
- Real-time visual feedback for changes
- Interactive 3D navigation and editing
- Save/load voxel configurations

## Technology Stack
- **Three.js**: 3D graphics and rendering
- **TypeScript**: Type-safe development
- **Vite**: Fast development server and build tool
- **dat.GUI**: User interface controls

## Code Conventions
- Use TypeScript for all new code
- Follow Three.js best practices for 3D scene management
- Keep voxel logic modular and reusable
- Use descriptive variable names for 3D coordinates (x, y, z)
- Comment complex 3D transformations and algorithms

## Architecture Guidelines
- Separate voxel data management from rendering logic
- Use object-oriented approach for voxel grid management
- Implement efficient frustum culling for large grids
- Cache geometry for repeated voxel shapes

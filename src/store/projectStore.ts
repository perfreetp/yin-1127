import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project } from '../types';

interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      currentProject: null,
      projects: [],

      setCurrentProject: (project) => set({ currentProject: project }),

      addProject: (project) => {
        const { projects } = get();
        set({
          projects: [...projects, project],
          currentProject: project,
        });
      },

      updateProject: (id, updates) => {
        const { projects, currentProject } = get();
        const updatedProjects = projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        const updatedCurrent =
          currentProject?.id === id
            ? { ...currentProject, ...updates }
            : currentProject;
        set({
          projects: updatedProjects,
          currentProject: updatedCurrent,
        });
      },

      deleteProject: (id) => {
        const { projects, currentProject } = get();
        set({
          projects: projects.filter((p) => p.id !== id),
          currentProject: currentProject?.id === id ? null : currentProject,
        });
      },

      clearProjects: () => {
        set({
          projects: [],
          currentProject: null,
        });
      },
    }),
    {
      name: 'audit-project-store',
    }
  )
);

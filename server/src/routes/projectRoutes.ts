import { Hono } from 'hono';
import {
  getProjects,
  createProject,
  bulkProjectAction,
  deleteProject,
  getFiles,
  createFile,
  compileProject,
  getJobStatus,
  getJobPdf,
  createShareLink,
  acceptShareLink,
  getProjectCollaborators,
  aiQuery,
} from '../controllers/projectController.js';

const projectRoutes = new Hono();

projectRoutes.get('/', getProjects);
projectRoutes.post('/', createProject);
projectRoutes.post('/bulk', bulkProjectAction);
projectRoutes.post('/share/accept', acceptShareLink); // Accept link is mounted at /share/accept relative to /projects
projectRoutes.delete('/:projectId', deleteProject);
projectRoutes.get('/:projectId/files', getFiles);
projectRoutes.post('/:projectId/files', createFile);
projectRoutes.post('/:projectId/compile', compileProject);
projectRoutes.get('/:projectId/jobs/:jobId', getJobStatus);
projectRoutes.get('/:projectId/jobs/:jobId/pdf', getJobPdf);
projectRoutes.post('/:projectId/share', createShareLink);
projectRoutes.get('/:projectId/collaborators', getProjectCollaborators);
projectRoutes.post('/:projectId/ai', aiQuery);

export default projectRoutes;

import React from 'react'

interface Project {
  id: number
  name: string
  description?: string
}

interface Task {
  id: number
  name: string
  description?: string
  project_id: number
}

interface Props {
  projects: Project[]
  tasks: Task[]
  selectedProject: Project | null
  selectedTask: Task | null
  onProjectSelect: (project: Project | null) => void
  onTaskSelect: (task: Task | null) => void
  onProjectChange: (projectId: number) => Promise<void>
}

const ProjectTaskSelector: React.FC<Props> = ({
  projects,
  tasks,
  selectedProject,
  selectedTask,
  onProjectSelect,
  onTaskSelect,
  onProjectChange
}) => {
  // Handle project selection
  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = parseInt(e.target.value)
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      onProjectSelect(project || null)
      await onProjectChange(projectId)
    } else {
      onProjectSelect(null)
      onTaskSelect(null)
    }
  }

  // Handle task selection
  const handleTaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taskId = parseInt(e.target.value)
    console.log('Task selection - raw value:', e.target.value)
    console.log('Task selection - taskId:', taskId)
    console.log('Task selection - available tasks:', tasks)
    
    if (taskId && !isNaN(taskId)) {
      const task = tasks.find(t => t.id === taskId)
      console.log('Task selection - found task:', task)
      onTaskSelect(task || null)
    } else {
      console.log('Task selection - clearing task')
      onTaskSelect(null)
    }
  }

  return (
    <div className="project-task-selector" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1rem',
      padding: '1rem',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div className="selector-group" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <label style={{
          fontWeight: 600,
          color: '#374151',
          fontSize: '14px'
        }}>Project:</label>
        <select 
          value={selectedProject?.id || ''}
          onChange={handleProjectChange}
          style={{
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option value="">Select a project...</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="selector-group" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <label style={{
          fontWeight: 600,
          color: '#374151',
          fontSize: '14px'
        }}>Task:</label>
        <select 
          value={selectedTask?.id || ''}
          onChange={handleTaskChange}
          disabled={!selectedProject}
          style={{
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: !selectedProject ? '#f9fafb' : 'white',
            fontSize: '0.875rem',
            color: !selectedProject ? '#6b7280' : 'inherit',
            cursor: !selectedProject ? 'not-allowed' : 'pointer'
          }}
        >
          <option value="">
            {!selectedProject ? 'Select a project first...' : 'Select a task...'}
          </option>
          {tasks.map(task => (
            <option key={task.id} value={task.id}>
              {task.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default ProjectTaskSelector

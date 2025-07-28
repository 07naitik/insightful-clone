import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  FolderOpen,
  Users,
  Clock,
  Calendar,
  Download,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { projectApi, taskApi } from '../utils/api'
import toast from 'react-hot-toast'

interface Project {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string | null
}

interface Task {
  id: number
  name: string
  description: string | null
  project_id: number
  project_name?: string
  is_active: boolean
  created_at: string
}

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Project | Task | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: '',
    is_active: true
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [projectsResponse, tasksResponse] = await Promise.all([
        projectApi.getAll(),
        taskApi.getAll()
      ])

      if (projectsResponse.success) {
        setProjects(projectsResponse.data)
      }

      if (tasksResponse.success) {
        // Enrich tasks with project names
        const enrichedTasks = tasksResponse.data.map((task: Task) => ({
          ...task,
          project_name: projectsResponse.success 
            ? projectsResponse.data.find((p: Project) => p.id === task.project_id)?.name || 'Unknown Project'
            : 'Unknown Project'
        }))
        setTasks(enrichedTasks)
      }
    } catch (error) {
      toast.error('Error loading data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && project.is_active) ||
                         (filterStatus === 'inactive' && !project.is_active)
    return matchesSearch && matchesFilter
  })

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.project_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && task.is_active) ||
                         (filterStatus === 'inactive' && !task.is_active)
    return matchesSearch && matchesFilter
  })

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const api = activeTab === 'projects' ? projectApi : taskApi
      const data = activeTab === 'projects' 
        ? { name: formData.name, description: formData.description, is_active: formData.is_active }
        : { name: formData.name, description: formData.description, project_id: parseInt(formData.project_id), is_active: formData.is_active }
      
      const response = await api.create(data)
      if (response.success) {
        toast.success(`${activeTab === 'projects' ? 'Project' : 'Task'} added successfully`)
        setShowAddModal(false)
        resetForm()
        fetchData()
      } else {
        toast.error(response.error || 'Failed to add')
      }
    } catch (error) {
      toast.error('Error adding item')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    try {
      const api = activeTab === 'projects' ? projectApi : taskApi
      const data = activeTab === 'projects'
        ? { name: formData.name, description: formData.description, is_active: formData.is_active }
        : { name: formData.name, description: formData.description, project_id: parseInt(formData.project_id), is_active: formData.is_active }
      
      const response = await api.update(editingItem.id, data)
      if (response.success) {
        toast.success(`${activeTab === 'projects' ? 'Project' : 'Task'} updated successfully`)
        setEditingItem(null)
        resetForm()
        fetchData()
      } else {
        toast.error(response.error || 'Failed to update')
      }
    } catch (error) {
      toast.error('Error updating item')
    }
  }

  const handleDelete = async (item: Project | Task) => {
    if (!confirm(`Are you sure you want to delete ${item.name}? This action cannot be undone.`)) {
      return
    }

    try {
      const api = activeTab === 'projects' ? projectApi : taskApi
      const response = await api.delete(item.id)
      if (response.success) {
        toast.success(`${activeTab === 'projects' ? 'Project' : 'Task'} deleted successfully`)
        fetchData()
      } else {
        toast.error(response.error || 'Failed to delete')
      }
    } catch (error) {
      toast.error('Error deleting item')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      project_id: '',
      is_active: true
    })
  }

  const openEditModal = (item: Project | Task) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      project_id: 'project_id' in item ? item.project_id.toString() : '',
      is_active: item.is_active
    })
  }

  const exportData = () => {
    const data = activeTab === 'projects' ? filteredProjects : filteredTasks
    const headers = activeTab === 'projects' 
      ? ['Name', 'Description', 'Status', 'Created']
      : ['Name', 'Description', 'Project', 'Status', 'Created']
    
    const rows = data.map(item => 
      activeTab === 'projects'
        ? [item.name, item.description || '', item.is_active ? 'Active' : 'Inactive', new Date(item.created_at).toLocaleDateString()]
        : [
            item.name, 
            item.description || '', 
            (item as Task).project_name || '', 
            item.is_active ? 'Active' : 'Inactive', 
            new Date(item.created_at).toLocaleDateString()
          ]
    )

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${activeTab} exported`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const currentData = activeTab === 'projects' ? filteredProjects : filteredTasks
  const totalActive = activeTab === 'projects' 
    ? projects.filter(p => p.is_active).length
    : tasks.filter(t => t.is_active).length
  const totalInactive = activeTab === 'projects'
    ? projects.filter(p => !p.is_active).length
    : tasks.filter(t => !t.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project & Task Management</h1>
          <p className="text-gray-600">Organize work into projects and track specific tasks</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportData}
            className="btn btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'projects' ? 'Project' : 'Task'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('projects')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'projects'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FolderOpen className="h-4 w-4 inline-block mr-2" />
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tasks'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CheckCircle className="h-4 w-4 inline-block mr-2" />
            Tasks ({tasks.length})
          </button>
        </nav>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-3">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              className="input w-auto"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="all">All {activeTab}</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {activeTab === 'projects' ? projects.length : tasks.length}
            </p>
            <p className="text-sm text-gray-600">Total {activeTab}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{totalActive}</p>
            <p className="text-sm text-gray-600">Active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{totalInactive}</p>
            <p className="text-sm text-gray-600">Inactive</p>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card p-0">
        <div className="table-container">
          <table className="table">
            <thead className="table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                {activeTab === 'tasks' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentData.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {activeTab === 'projects' ? (
                          <FolderOpen className="h-5 w-5 text-purple-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      </div>
                    </div>
                  </td>
                  {activeTab === 'tasks' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <FolderOpen className="h-3 w-3 mr-1 text-purple-400" />
                        {(item as Task).project_name}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                    <div className="truncate">
                      {item.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-primary-600 hover:text-primary-900 p-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {currentData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-3">
                {activeTab === 'projects' ? (
                  <FolderOpen className="h-12 w-12 mx-auto" />
                ) : (
                  <CheckCircle className="h-12 w-12 mx-auto" />
                )}
              </div>
              <p className="text-gray-500">No {activeTab} found matching your criteria</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-primary-600 hover:text-primary-500 text-sm mt-2"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New {activeTab === 'projects' ? 'Project' : 'Task'}
              </h3>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input mt-1"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                {activeTab === 'tasks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <select
                      className="input mt-1"
                      value={formData.project_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.filter(p => p.is_active).map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="text-sm text-gray-700">Active</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add {activeTab === 'projects' ? 'Project' : 'Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit {activeTab === 'projects' ? 'Project' : 'Task'}
              </h3>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    className="input mt-1"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="input mt-1"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>
                {activeTab === 'tasks' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project</label>
                    <select
                      className="input mt-1"
                      value={formData.project_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.filter(p => p.is_active).map(project => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  />
                  <label className="text-sm text-gray-700">Active</label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null)
                      resetForm()
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update {activeTab === 'projects' ? 'Project' : 'Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectsPage
